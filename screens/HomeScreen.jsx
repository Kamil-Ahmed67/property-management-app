import { useContext, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { AuthContext } from '../providers/AuthProvider';
import { useLanguage } from '../providers/LanguageProvider';
import { colors } from '../theme';
import config from '../config';
import { toBengaliDigits } from '../utils/localeFormat';

import BillStatusRow from '../components/BillStatusRow';
import SectionGrid from '../components/SectionGrid';
import FeedbackCard from '../components/FeedbackCard';
import HomeModeToggle from '../components/Tenant/HomeModeToggle';
import PrayerTimesCard from './PrayerTimesCard';
import ConnectionRequestsScreen from './ConnectionRequestsScreen';
import { useScrollMemory } from '../hooks/useScrollMemory';

const TENANT_ID = 'PropHub';

const MONTH_VALUES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_KEYS = [
  'month.january', 'month.february', 'month.march', 'month.april',
  'month.may', 'month.june', 'month.july', 'month.august',
  'month.september', 'month.october', 'month.november', 'month.december',
];

const propertySection = [
  { key: 'manage-building', labelKey: 'section.manageBuilding', icon: 'business-outline' },
  { key: 'tenant-list', labelKey: 'section.addTenants', icon: 'person-add-outline' },
  { key: 'empty-unit', labelKey: 'section.emptyUnit', icon: 'home-outline' },
  { key: 'complain', labelKey: 'section.complain', icon: 'alert-circle-outline' },
  // { key: 'connection-requests', labelKey: 'section.connectionRequests', icon: 'link-outline' },
];

const financeSection = [
  { key: 'create-bill', labelKey: 'section.createBill', icon: 'add-circle-outline' },
  { key: 'bill-collection', labelKey: 'section.billCollection', icon: 'cash-outline' },
  { key: 'expense-list', labelKey: 'section.expense', icon: 'wallet-outline' },
  { key: 'due', labelKey: 'section.due', icon: 'calendar-outline' },
];

function localizedCount(count, lang) {
  return lang === 'bn' ? toBengaliDigits(count) : String(count);
}

export default function HomeScreen({ onNavigate }) {
  const { loginData } = useContext(AuthContext);
  const { t, lang } = useLanguage();
  const phone = loginData?.Phone || loginData?.phone || '';
  const scrollProps = useScrollMemory('home');

  const [totalCollected, setTotalCollected] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [unitsCount, setUnitsCount] = useState(0);
  const [expenseCount, setExpenseCount] = useState(0);
  const [periodLabel, setPeriodLabel] = useState('');

  const [propertiesCount, setPropertiesCount] = useState(0);
  const [tenantsCount, setTenantsCount] = useState(0);
  const [dueCount, setDueCount] = useState(0);
  const [unreadComplainCount, setUnreadComplainCount] = useState(0);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);

  const [countsLoaded, setCountsLoaded] = useState(false);

  // Local dashboard toggle — 'landlord' (default) shows the normal
  // dashboard, 'requests' shows incoming tenant requests inline.
  const [homeMode, setHomeMode] = useState('landlord');

  function tileMeta(key) {
    switch (key) {
      case 'manage-building':
        return {
          loading: !countsLoaded,
          subtitle: countsLoaded
            ? t('sectionCount.properties', { count: localizedCount(propertiesCount, lang) })
            : null,
        };
      case 'tenant-list':
        return {
          loading: !countsLoaded,
          subtitle: countsLoaded
            ? t('sectionCount.tenants', { count: localizedCount(tenantsCount, lang) })
            : null,
        };
      case 'create-bill':
        return {
          loading: !countsLoaded,
          subtitle: countsLoaded
            ? t('sectionCount.generated', { count: localizedCount(unitsCount, lang) })
            : null,
        };
      case 'bill-collection':
      case 'due':
        return {
          loading: !countsLoaded,
          subtitle: countsLoaded
            ? t('sectionCount.due', { count: localizedCount(dueCount, lang) })
            : null,
        };
      case 'expense-list':
        return {
          loading: !countsLoaded,
          subtitle: countsLoaded
            ? t('sectionCount.entries', { count: localizedCount(expenseCount, lang) })
            : null,
        };
      case 'complain':
        return { loading: false, subtitle: null, badgeCount: unreadComplainCount };
      case 'connection-requests':
        // Same badge treatment as complaints — a red count dot for
        // pending tenant connection requests against this Owner's
        // properties.
        return { loading: false, subtitle: null, badgeCount: pendingRequestCount };
      default:
        return { loading: false, subtitle: null };
    }
  }

  const localize = (items) =>
    items.map((item) => {
      const meta = tileMeta(item.key);
      return {
        ...item,
        label: t(item.labelKey),
        subtitle: meta.subtitle,
        loading: meta.loading,
        badgeCount: meta.badgeCount || 0,
      };
    });

  function monthLabel(monthNumber) {
    return t(MONTH_KEYS[monthNumber - 1]);
  }

  async function safeFetchJson(url) {
    try {
      const response = await fetch(url, { headers: { TenantId: TENANT_ID } });
      const data = await response.json().catch(() => null);
      return response.ok && data?.success ? data.data || [] : [];
    } catch (err) {
      console.log('Request failed:', url, err.message);
      return [];
    }
  }

  useEffect(() => {
    if (!phone) return;

    const now = new Date();
    const billMonth = MONTH_VALUES[now.getMonth()];
    const billYear = String(now.getFullYear());
    const uId = loginData?.Id;

    (async () => {
      const [bills, expenses, properties, tenants] = await Promise.all([
        safeFetchJson(
          `${config.BMS_API}api/GetBillList?phone=${encodeURIComponent(phone)}&billMonth=${encodeURIComponent(billMonth)}&billYear=${encodeURIComponent(billYear)}`
        ),
        safeFetchJson(
          `${config.BMS_API}api/GetExpenseList?phone=${encodeURIComponent(phone)}&expenseMonth=${now.getMonth() + 1}&expenseYear=${now.getFullYear()}`
        ),
        safeFetchJson(`${config.BMS_API}api/GetMyPropertyList?phone=${encodeURIComponent(phone)}&uId=${uId}`),
        safeFetchJson(`${config.BMS_API}api/GetTenantList?phone=${encodeURIComponent(phone)}&uId=${uId}`),
      ]);

      setTotalCollected(bills.reduce((sum, b) => sum + (b.PaidAmount || 0), 0));
      setUnitsCount(bills.length);
      setTotalExpense(expenses.reduce((sum, e) => sum + (e.ExpenseAmount || 0), 0));
      setExpenseCount(expenses.length);
      setPeriodLabel(`${monthLabel(now.getMonth() + 1)} ${billYear}`);

      setPropertiesCount(properties.length);
      setTenantsCount(tenants.length);
      setDueCount(bills.filter((b) => (b.Status || '').toLowerCase() !== 'paid').length);

      setCountsLoaded(true);
    })();

    // Complaint + connection-request badges — independent of the block
    // above, refetched on a short interval so either badge appears
    // without needing a manual screen refresh.
    async function refreshBadges() {
      try {
        const [complainRes, requestsRes] = await Promise.all([
          fetch(`${config.BMS_API}api/GetUnreadComplainCount?uId=${uId}`, { headers: { TenantId: TENANT_ID } })
            .then((r) => r.json().catch(() => null)),
          fetch(
            `${config.BMS_API}api/GetConnectionRequestsForLandlord?landlordUId=${uId}&landlordMobile=${encodeURIComponent(phone)}`,
            { headers: { TenantId: TENANT_ID } }
          ).then((r) => r.json().catch(() => null)),
        ]);

        if (complainRes?.success) setUnreadComplainCount(complainRes.data || 0);
        if (requestsRes?.success) setPendingRequestCount((requestsRes.data || []).length);
      } catch (err) {
        console.log('Failed to refresh badges:', err.message);
      }
    }

    refreshBadges();
    const interval = setInterval(refreshBadges, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone]);

  const modeOptions = [
    { key: 'landlord', label: t('home.modeLandlord') },
    {
      key: 'requests',
      label: t('home.modeRequests'),
      badge: pendingRequestCount,
      badgeText: localizedCount(pendingRequestCount, lang),
    },
  ];

  return (
    <ScrollView {...scrollProps} style={styles.page} contentContainerStyle={styles.content}>
      <PrayerTimesCard />
        <View style={styles.modeWrap}>
        <HomeModeToggle mode={homeMode} onChange={setHomeMode} options={modeOptions} />

        {homeMode === 'requests' ? (
          <ConnectionRequestsScreen
            embedded
            // Accept/Reject reloads the list; keep the toggle + tile badge in sync.
            onCountChange={setPendingRequestCount}
            onViewAll={() => onNavigate?.('connection-requests')}
          />
        ) : null}
      </View>
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

      <SectionGrid
        title={t('home.finance')}
        items={localize(financeSection)}
        onSelect={onNavigate}
        paletteOffset={1}
      />

      <FeedbackCard onSubmit={() => onNavigate?.('feedback')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { paddingTop: 18, paddingBottom: 15 },
  modeWrap: { paddingHorizontal: 12 },
  title: {
    color: colors.text, fontSize: 20, fontFamily: 'Manrope-ExtraBold',
    letterSpacing: -0.2, marginBottom: 16, paddingHorizontal: 16,
  },
});