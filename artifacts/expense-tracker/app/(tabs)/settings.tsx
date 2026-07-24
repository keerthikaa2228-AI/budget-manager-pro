import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Platform, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useExpenses, Category, CATEGORY_COLOR_OPTIONS, CATEGORY_ICON_OPTIONS, FREE_CATEGORY_LIMIT } from '@/contexts/ExpenseContext';
import { useSubscription } from '@/lib/revenuecat';
import { PaywallModal } from '@/components/PaywallModal';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { expenses, categories, currentMonth, addCategory, deleteCategory, monthlyTotal } = useExpenses();
  const { isSubscribed, restore, isRestoring, isPurchasing } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(CATEGORY_COLOR_OPTIONS[0]);
  const [newCatIcon, setNewCatIcon] = useState(CATEGORY_ICON_OPTIONS[0]);
  const [isExporting, setIsExporting] = useState(false);

  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === 'web' ? 84 + 34 : 84;
  const customCategories = categories.filter(c => !c.isDefault);
  const canAddCategory = isSubscribed || categories.length < FREE_CATEGORY_LIMIT;

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const result = addCategory({ name: newCatName.trim(), color: newCatColor, icon: newCatIcon }, isSubscribed);
    if (result === 'limit') {
      setShowAddCategory(false);
      setShowPaywall(true);
      return;
    }
    setShowAddCategory(false);
    setNewCatName('');
    setNewCatColor(CATEGORY_COLOR_OPTIONS[0]);
    setNewCatIcon(CATEGORY_ICON_OPTIONS[0]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDeleteCategory = (cat: Category) => {
    Alert.alert('Delete Category', `Remove "${cat.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          deleteCategory(cat.id);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      },
    ]);
  };

  const handleExportCSV = async () => {
    if (!isSubscribed) { setShowPaywall(true); return; }
    setIsExporting(true);
    try {
      const catMap: Record<string, string> = {};
      categories.forEach(c => { catMap[c.id] = c.name; });
      const header = 'Date,Category,Amount,Note\n';
      const rows = expenses.map(e =>
        `${e.date},"${catMap[e.categoryId] ?? 'Unknown'}",${e.amount.toFixed(2)},"${e.note.replace(/"/g, '""')}"`
      ).join('\n');
      const csv = header + rows;
      const path = (FileSystem.documentDirectory ?? '') + 'expenses_export.csv';
      await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Export Expenses CSV' });
    } catch (e) {
      Alert.alert('Export Failed', 'Could not export your expenses.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!isSubscribed) { setShowPaywall(true); return; }
    setIsExporting(true);
    try {
      const catMap: Record<string, string> = {};
      const catColorMap: Record<string, string> = {};
      categories.forEach(c => { catMap[c.id] = c.name; catColorMap[c.id] = c.color; });
      const monthLabel = `${MONTHS[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
      const rows = expenses.map(e => `
        <tr>
          <td>${e.date}</td>
          <td><span style="color:${catColorMap[e.categoryId] ?? '#333'}">&#9679;</span> ${catMap[e.categoryId] ?? 'Unknown'}</td>
          <td style="text-align:right;font-weight:600;">$${e.amount.toFixed(2)}</td>
          <td style="color:#666;">${e.note}</td>
        </tr>
      `).join('');
      const html = `
        <html><head><style>
          body { font-family: -apple-system, sans-serif; padding: 32px; color: #0F172A; }
          h1 { font-size: 28px; margin-bottom: 4px; }
          .subtitle { color: #64748B; margin-bottom: 24px; }
          .total { font-size: 22px; font-weight: 700; color: #059669; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; }
          th { text-align: left; padding: 10px; background: #F1F5F9; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
          td { padding: 10px; border-bottom: 1px solid #E2E8F0; font-size: 14px; }
        </style></head><body>
          <h1>Expense Report</h1>
          <p class="subtitle">${monthLabel}</p>
          <p class="total">Total: $${monthlyTotal.toFixed(2)}</p>
          <table>
            <tr><th>Date</th><th>Category</th><th style="text-align:right">Amount</th><th>Note</th></tr>
            ${rows}
          </table>
        </body></html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Export Expenses PDF' });
    } catch (e) {
      Alert.alert('Export Failed', 'Could not generate the PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: topPad + 16, paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Categories</Text>
            {!isSubscribed && (
              <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
                {categories.length}/{FREE_CATEGORY_LIMIT} free
              </Text>
            )}
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {categories.map((cat, idx) => (
              <View
                key={cat.id}
                style={[styles.catRow, idx < categories.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
              >
                <View style={[styles.catDot, { backgroundColor: cat.color }]}>
                  <Feather name={cat.icon as any} size={13} color="#fff" />
                </View>
                <Text style={[styles.catName, { color: colors.foreground }]}>{cat.name}</Text>
                {cat.isDefault ? (
                  <Text style={[styles.defaultBadge, { color: colors.mutedForeground }]}>Default</Text>
                ) : (
                  <TouchableOpacity onPress={() => handleDeleteCategory(cat)} hitSlop={8}>
                    <Feather name="trash-2" size={16} color={colors.destructive} />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <TouchableOpacity
              style={[styles.addCatBtn, { borderColor: canAddCategory ? colors.primary : colors.border }]}
              onPress={() => canAddCategory ? setShowAddCategory(true) : setShowPaywall(true)}
              activeOpacity={0.7}
            >
              <Feather name="plus" size={16} color={canAddCategory ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.addCatText, { color: canAddCategory ? colors.primary : colors.mutedForeground }]}>
                {canAddCategory ? 'Add Category' : 'Unlock More Categories'}
              </Text>
              {!canAddCategory && <Feather name="star" size={14} color={colors.accent} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Export */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Export</Text>
            {!isSubscribed && <Feather name="star" size={14} color={colors.accent} />}
          </View>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.menuRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
              onPress={handleExportCSV}
              disabled={isExporting}
            >
              {isExporting ? <ActivityIndicator size="small" color={colors.primary} /> : <Feather name="file-text" size={18} color={colors.primary} />}
              <Text style={[styles.menuLabel, { color: colors.foreground }]}>Export to CSV</Text>
              {!isSubscribed && <Feather name="lock" size={14} color={colors.mutedForeground} />}
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuRow} onPress={handleExportPDF} disabled={isExporting}>
              {isExporting ? <ActivityIndicator size="small" color={colors.primary} /> : <Feather name="file" size={18} color={colors.primary} />}
              <Text style={[styles.menuLabel, { color: colors.foreground }]}>Export to PDF</Text>
              {!isSubscribed && <Feather name="lock" size={14} color={colors.mutedForeground} />}
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Premium */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Premium</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {isSubscribed ? (
              <View style={styles.premiumActive}>
                <View style={[styles.premiumBadge, { backgroundColor: `${colors.primary}18` }]}>
                  <Feather name="check-circle" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.premiumActiveTitle, { color: colors.foreground }]}>Premium Unlocked</Text>
                  <Text style={[styles.premiumActiveSub, { color: colors.mutedForeground }]}>You have full access to all features</Text>
                </View>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.menuRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                  onPress={() => setShowPaywall(true)}
                >
                  <Feather name="star" size={18} color={colors.accent} />
                  <Text style={[styles.menuLabel, { color: colors.foreground }]}>Upgrade to Premium</Text>
                  <Text style={[styles.priceBadge, { backgroundColor: colors.accent }]}>$1.99</Text>
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuRow} onPress={() => restore()} disabled={isRestoring}>
                  {isRestoring ? <ActivityIndicator size="small" color={colors.primary} /> : <Feather name="refresh-cw" size={18} color={colors.mutedForeground} />}
                  <Text style={[styles.menuLabel, { color: colors.foreground }]}>Restore Purchases</Text>
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* App info */}
        <Text style={[styles.version, { color: colors.mutedForeground }]}>Expense Tracker · v1.0.0</Text>
      </ScrollView>

      {/* Add Category Modal */}
      <Modal visible={showAddCategory} transparent animationType="slide" onRequestClose={() => setShowAddCategory(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowAddCategory(false)} />
          <View style={[styles.addCatModal, { backgroundColor: colors.card }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Category</Text>
              <TouchableOpacity onPress={() => setShowAddCategory(false)} hitSlop={12}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.catNameInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.muted }]}
              value={newCatName}
              onChangeText={setNewCatName}
              placeholder="Category name"
              placeholderTextColor={colors.mutedForeground}
              maxLength={24}
              autoFocus
            />
            <Text style={[styles.pickerLabel, { color: colors.mutedForeground }]}>Color</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={styles.colorRow}>
                {CATEGORY_COLOR_OPTIONS.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[styles.colorDot, { backgroundColor: color, borderWidth: newCatColor === color ? 3 : 0, borderColor: colors.foreground }]}
                    onPress={() => setNewCatColor(color)}
                  />
                ))}
              </View>
            </ScrollView>
            <Text style={[styles.pickerLabel, { color: colors.mutedForeground }]}>Icon</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              <View style={styles.iconRow}>
                {CATEGORY_ICON_OPTIONS.map(icon => (
                  <TouchableOpacity
                    key={icon}
                    style={[styles.iconBtn, { backgroundColor: newCatIcon === icon ? newCatColor : colors.muted }]}
                    onPress={() => setNewCatIcon(icon)}
                  >
                    <Feather name={icon as any} size={16} color={newCatIcon === icon ? '#fff' : colors.mutedForeground} />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity
              style={[styles.saveCatBtn, { backgroundColor: newCatName.trim() ? colors.primary : colors.border, borderRadius: 12 }]}
              onPress={handleAddCategory}
              disabled={!newCatName.trim()}
            >
              <Text style={[styles.saveCatBtnText, { color: newCatName.trim() ? '#fff' : colors.mutedForeground }]}>
                Add Category
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, gap: 0 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  sectionHint: { fontSize: 13, fontFamily: 'Inter_400Regular', marginLeft: 'auto' },
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  catDot: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  catName: { flex: 1, fontSize: 15, fontFamily: 'Inter_500Medium' },
  defaultBadge: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  addCatBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderTopWidth: 1 },
  addCatText: { flex: 1, fontSize: 15, fontFamily: 'Inter_500Medium' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: 'Inter_500Medium' },
  priceBadge: { color: '#fff', fontSize: 11, fontFamily: 'Inter_700Bold', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  premiumActive: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  premiumBadge: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  premiumActiveTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  premiumActiveSub: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  version: { textAlign: 'center', fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 8 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  addCatModal: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  catNameInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16, fontFamily: 'Inter_400Regular', marginBottom: 18 },
  pickerLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  colorRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 4 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  iconRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 4 },
  iconBtn: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  saveCatBtn: { paddingVertical: 14, alignItems: 'center' },
  saveCatBtnText: { fontSize: 16, fontFamily: 'Inter_700Bold' },
});
