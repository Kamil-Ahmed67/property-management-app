import { useContext, useEffect, useState } from 'react';
import { Text, ScrollView, StyleSheet } from 'react-native';
import { AuthContext } from '../providers/AuthProvider';
import { useLanguage } from '../providers/LanguageProvider';
import { colors } from '../theme';
import config from '../config';

// import IncomeCard from '../components/IncomeCard';
// import CampaignBanner from '../components/CampaignBanner';
import BillStatusRow from '../components/BillStatusRow';
import SectionGrid from '../components/SectionGrid';
import FeedbackCard from '../components/FeedbackCard';
import PrayerTimesCard from './PrayerTimesCard';
import { useScrollMemory } from '../hooks/useScrollMemory';

const TENANT_ID = 'PropHub';

// `value` matches what BillGenerateScreen/BillCollectionScreen send as
// BillMonth — English month names, since that's what tblBill stores.
const MONTH_VALUES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_KEYS = [
  'month.january', 'month.february', 'month.march', 'month.april',
  'month.may', 'month.june', 'month.july', 'month.august',
  'month.september', 'month.october', 'month.november', 'month.december',
];

// Labels are translation KEYS — resolved via t() at render time so they
// re-render in the new language the moment the toggle is pressed.
const propertySection = [
  { key: 'manage-building', labelKey: 'section.manageBuilding', icon: 'business-outline' },
  { key: 'add-tenants', labelKey: 'section.addTenants', icon: 'person-add-outline' },
  { key: 'notice', labelKey: 'section.notice', icon: 'megaphone-outline' },
  { key: 'complain', labelKey: 'section.complain', icon: 'alert-circle-outline' },
];

const utilitiesSection = [
  { key: 'gas-purchase', labelKey: 'section.gasPurchase', icon: 'flame-outline' },
  { key: 'gas-stock', labelKey: 'section.gasStock', icon: 'cube-outline' },
  { key: 'gas-usage', labelKey: 'section.gasUsage', icon: 'speedometer-outline' },
  { key: 'utility-service', labelKey: 'section.utilityService', icon: 'settings-outline' },
  { key: 'note', labelKey: 'section.note', icon: 'document-outline' },
  { key: 'support', labelKey: 'section.support', icon: 'headset-outline' },
];

const financeSection = [
  { key: 'create-bill', labelKey: 'section.createBill', icon: 'add-circle-outline' },
  { key: 'bill-collection', labelKey: 'section.billCollection', icon: 'cash-outline' },
  { key: 'expense-list', labelKey: 'section.expense', icon: 'wallet-outline' },
  //{ key: 'all-bills', labelKey: 'section.allBills', icon: 'receipt-outline' },
  { key: 'monthly-bill', labelKey: 'section.monthlyBill', icon: 'calendar-outline' },
];

export default function HomeScreen({ onNavigate }) {
  const { loginData } = useContext(AuthContext);
  const { t } = useLanguage();
  const phone = loginData?.Phone || loginData?.phone || '';
  const scrollProps = useScrollMemory('home');
  const [totalCollected, setTotalCollected] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [unitsCount, setUnitsCount] = useState(0);
  const [expenseCount, setExpenseCount] = useState(0);
  const [periodLabel, setPeriodLabel] = useState('');
  // SectionGrid expects { key, label, icon } — resolve labelKey -> label.
  const localize = (items) => items.map((item) => ({ ...item, label: t(item.labelKey) }));

  function monthLabel(monthNumber) {
    return t(MONTH_KEYS[monthNumber - 1]);
  }

  useEffect(() => {
    if (!phone) return;

    const now = new Date();
    const billMonth = MONTH_VALUES[now.getMonth()];
    const billYear = String(now.getFullYear());

    (async () => {
      try {
        const [billRes, expenseRes] = await Promise.all([
          fetch(
            `${config.BMS_API}api/GetBillList?phone=${encodeURIComponent(phone)}&billMonth=${encodeURIComponent(billMonth)}&billYear=${encodeURIComponent(billYear)}`,
            { headers: { TenantId: TENANT_ID } }
          ).then((r) => r.json().catch(() => null)),
          fetch(
            `${config.BMS_API}api/GetExpenseList?phone=${encodeURIComponent(phone)}&expenseMonth=${now.getMonth() + 1}&expenseYear=${now.getFullYear()}`,
            { headers: { TenantId: TENANT_ID } }
          ).then((r) => r.json().catch(() => null)),
        ]);

        const bills = billRes?.success ? billRes.data || [] : [];
        const expenses = expenseRes?.success ? expenseRes.data || [] : [];

        setTotalCollected(bills.reduce((sum, b) => sum + (b.PaidAmount || 0), 0));
        setUnitsCount(bills.length);
        setTotalExpense(expenses.reduce((sum, e) => sum + (e.ExpenseAmount || 0), 0));
        setExpenseCount(expenses.length);
        setPeriodLabel(`${monthLabel(now.getMonth() + 1)} ${billYear}`);
      } catch (err) {
        console.log('Failed to load this month\u2019s financial summary:', err.message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone]);

  return (
    <ScrollView {...scrollProps} style={styles.page} contentContainerStyle={styles.content}>
      {/* <Text style={styles.title}>
        {t('home.welcome')}{loginData?.Name ? `, ${loginData.Name}` : ''}
      </Text> */}
      <PrayerTimesCard />
      {/* <IncomeCard amount={11000} totalTenants={2} totalRooms={2} /> */}

      <BillStatusRow
        income={totalCollected}
        expense={totalExpense}
        periodLabel={periodLabel}
        unitsCount={unitsCount}
        expenseCount={expenseCount}
      />

      <SectionGrid
        title={t('home.propertyManagement')}
        items={localize(propertySection)}
        onSelect={onNavigate}
        paletteOffset={0}
      />
      {/* <CampaignBanner onSelect={onNavigate} /> */}
       <SectionGrid
        title={t('home.finance')}
        items={localize(financeSection)}
        onSelect={onNavigate}
        paletteOffset={1}
      />
        <SectionGrid
        title={t('home.utilities')}
        items={localize(utilitiesSection)}
        onSelect={onNavigate}
        paletteOffset={2}
      />
      <FeedbackCard onSubmit={() => onNavigate?.('feedback')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingTop: 18,
    paddingBottom: 15,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontFamily: 'Manrope-ExtraBold',
    letterSpacing: -0.2,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
});