'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { useState, useEffect } from 'react';
import { Save, RefreshCcw, Globe, Palette, Truck, DollarSign, Share2, Settings2, Image, Key, MessageSquare, Mail, Bell, CreditCard, Smartphone, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { MediaUpload } from '@/components/MediaUpload';

type SettingType = 'text' | 'email' | 'url' | 'number' | 'color' | 'boolean' | 'phone' | 'secret' | 'image';
interface SettingDef { key: string; label: string; type: SettingType; placeholder?: string; help?: string; }
interface SettingGroup { id: string; label: string; icon: React.ElementType; settings: SettingDef[]; }

const GROUPS: SettingGroup[] = [
  {
    id: 'general', label: 'General', icon: Globe,
    settings: [
      { key: 'SITE_NAME', label: 'Site Name', type: 'text', placeholder: 'TotalStore', help: 'Shown in browser tabs and search results' },
      { key: 'SITE_TAGLINE', label: 'Tagline', type: 'text', placeholder: "Africa's #1 Online Marketplace" },
      { key: 'SITE_EMAIL', label: 'Support Email', type: 'email', placeholder: 'support@totalstore.ug' },
      { key: 'SITE_PHONE', label: 'Support Phone', type: 'phone', placeholder: '+256 700 000 000' },
      { key: 'SITE_ADDRESS', label: 'Physical Address', type: 'text', placeholder: 'Kampala, Uganda' },
      { key: 'CURRENCY', label: 'Currency Code', type: 'text', placeholder: 'UGX', help: 'ISO 4217 code (UGX, USD, KES …)' },
      { key: 'FOOTER_COPYRIGHT', label: 'Footer Copyright', type: 'text', placeholder: '© {year} TotalStore. All rights reserved.' },
    ],
  },
  {
    id: 'branding', label: 'Branding', icon: Image,
    settings: [
      { key: 'SITE_LOGO_URL', label: 'Site Logo', type: 'image', help: 'PNG or SVG with transparent background. Used on the storefront and footer.' },
      { key: 'SITE_LOGO_DARK_URL', label: 'Dark-mode Logo', type: 'image', help: 'Optional — shown when dark mode is active.' },
      { key: 'SITE_FAVICON_URL', label: 'Favicon', type: 'image', help: '32×32 ICO or PNG' },
      { key: 'SITE_OG_IMAGE_URL', label: 'Social Share Image', type: 'image', help: '1200×630 px — shown when links are shared on social media.' },
      { key: 'APPLE_ICON_URL', label: 'Apple Touch Icon', type: 'image', help: '180×180 px PNG — shown on iOS home screens.' },
    ],
  },
  {
    id: 'mobile_branding', label: 'Mobile App Branding', icon: Smartphone,
    settings: [
      { key: 'BUYER_APP_LOGO_URL', label: 'Buyer App Logo', type: 'image', help: 'Logo shown on the buyer app splash screen and home bar. Square PNG recommended (512×512).' },
      { key: 'RIDER_APP_LOGO_URL', label: 'Rider App Logo', type: 'image', help: 'Logo shown on the rider app splash screen. Square PNG recommended (512×512).' },
      { key: 'SELLER_APP_LOGO_URL', label: 'Seller App Logo', type: 'image', help: 'Logo shown on the seller app splash screen. Square PNG recommended (512×512).' },
      { key: 'BUYER_APP_TAGLINE', label: 'Buyer App Tagline', type: 'text', placeholder: "Africa's favourite marketplace" },
      { key: 'RIDER_APP_TAGLINE', label: 'Rider App Tagline', type: 'text', placeholder: 'Delivering happiness across Africa' },
      { key: 'SELLER_APP_TAGLINE', label: 'Seller App Tagline', type: 'text', placeholder: 'Your business, our platform' },
      { key: 'BUYER_APP_SPLASH_COLOR', label: 'Buyer Splash Color', type: 'color', help: 'Primary gradient color for the buyer app splash screen' },
      { key: 'RIDER_APP_SPLASH_COLOR', label: 'Rider Splash Color', type: 'color', help: 'Primary gradient color for the rider app splash screen' },
      { key: 'SELLER_APP_SPLASH_COLOR', label: 'Seller Splash Color', type: 'color', help: 'Primary gradient color for the seller app splash screen' },
    ],
  },
  {
    id: 'theme', label: 'Theme', icon: Palette,
    settings: [
      { key: 'PRIMARY_COLOR', label: 'Primary Color', type: 'color', help: 'Main brand color — applied to buttons, links, top nav bar and interactive elements' },
      { key: 'ACCENT_COLOR', label: 'Accent Color', type: 'color', help: 'Secondary CTA color — used for search button, cart badge and sale icons' },
      { key: 'HEADER_BG_COLOR', label: 'Header / Nav Background', type: 'color', help: 'Background of the navigation bar (below the top bar)' },
      { key: 'FOOTER_BG_COLOR', label: 'Footer Background', type: 'color', help: 'Background color of the site footer' },
      { key: 'BANNER_BG_COLOR', label: 'Announcement Bar Background', type: 'color', help: 'Background of the top announcement strip' },
      { key: 'BANNER_TEXT', label: 'Announcement Bar Text', type: 'text', placeholder: 'Free delivery above UGX 50,000!', help: 'Leave empty to hide the announcement bar entirely' },
      { key: 'FONT_FAMILY', label: 'Font Family', type: 'text', placeholder: 'Plus Jakarta Sans', help: 'Google Fonts name (e.g. "Inter", "Roboto"). Requires a rebuild to take full effect.' },
    ],
  },
  {
    id: 'delivery', label: 'Delivery', icon: Truck,
    settings: [
      { key: 'FREE_DELIVERY_THRESHOLD', label: 'Free Delivery Threshold (UGX)', type: 'number', placeholder: '50000' },
      { key: 'DELIVERY_FEE_DEFAULT', label: 'Default Delivery Fee (UGX)', type: 'number', placeholder: '5000' },
      { key: 'MAX_DELIVERY_RADIUS_KM', label: 'Max Delivery Radius (km)', type: 'number', placeholder: '30' },
      { key: 'COD_ENABLED', label: 'Cash on Delivery Enabled', type: 'boolean' },
    ],
  },
  {
    id: 'commission', label: 'Commission', icon: DollarSign,
    settings: [
      { key: 'DEFAULT_COMMISSION', label: 'Default Commission (%)', type: 'number', placeholder: '10' },
      { key: 'MIN_PAYOUT', label: 'Min Seller Payout (UGX)', type: 'number', placeholder: '10000' },
      { key: 'PAYOUT_CYCLE_DAYS', label: 'Payout Cycle (days)', type: 'number', placeholder: '7', help: 'Days after delivery before seller is paid' },
      { key: 'MTN_MOMO_ENV', label: 'MTN MoMo Environment', type: 'text', placeholder: 'sandbox', help: 'sandbox or production' },
    ],
  },
  {
    id: 'social', label: 'Social', icon: Share2,
    settings: [
      { key: 'SOCIAL_FACEBOOK', label: 'Facebook URL', type: 'url', placeholder: 'https://facebook.com/totalstore' },
      { key: 'SOCIAL_INSTAGRAM', label: 'Instagram URL', type: 'url', placeholder: 'https://instagram.com/totalstore' },
      { key: 'SOCIAL_TIKTOK', label: 'TikTok URL', type: 'url', placeholder: 'https://tiktok.com/@totalstore' },
      { key: 'SOCIAL_TWITTER', label: 'X / Twitter URL', type: 'url', placeholder: 'https://x.com/totalstore' },
      { key: 'SOCIAL_WHATSAPP', label: 'WhatsApp Number', type: 'phone', placeholder: '+256700000000', help: 'Country code, no spaces' },
      { key: 'SOCIAL_YOUTUBE', label: 'YouTube URL', type: 'url', placeholder: 'https://youtube.com/@totalstore' },
    ],
  },
  {
    id: 'pages', label: 'Pages (CMS)', icon: Globe,
    settings: [
      { key: 'PAGE_ABOUT_MISSION', label: 'About — Mission Statement', type: 'text', placeholder: 'Make commerce simple, affordable, and accessible for every African.', help: 'Shown under "Our Mission" on the About page' },
      { key: 'PAGE_ABOUT_STORY', label: 'About — Our Story', type: 'text', placeholder: 'Founded to transform commerce in Africa...', help: 'HTML allowed. Shown under "Our Story" on the About page' },
      { key: 'PAGE_ABOUT_TEAM_JSON', label: 'About — Team Members (JSON)', type: 'text', placeholder: '[{"name":"CEO","initials":"TK","title":"CEO & Co-Founder","color":"from-sky-400 to-sky-600"}]', help: 'JSON array of team members. Each: name, title, initials, color (gradient classes)' },
      { key: 'PAGE_CAREERS_POSITIONS_JSON', label: 'Careers — Positions (JSON)', type: 'text', placeholder: '[{"title":"Senior Backend Engineer","dept":"Engineering","location":"Remote","type":"Full-time"}]', help: 'JSON array of open positions. Each: title, dept, location, type' },
      { key: 'PAGE_CAREERS_BENEFITS_JSON', label: 'Careers — Benefits (JSON)', type: 'text', placeholder: '["Competitive salary","Health insurance","Flexible hours"]', help: 'JSON array of benefit strings' },
      { key: 'PAGE_CAREERS_EMAIL', label: 'Careers — Application Email', type: 'email', placeholder: 'careers@totalstore.ug', help: 'Email for job applications' },
    ],
  },
  {
    id: 'app', label: 'App Config', icon: Settings2,
    settings: [
      { key: 'MAINTENANCE_MODE', label: 'Maintenance Mode', type: 'boolean', help: 'Shows maintenance page to storefront visitors' },
      { key: 'PRODUCTS_PER_PAGE', label: 'Products per Page', type: 'number', placeholder: '24' },
      { key: 'REVIEWS_ENABLED', label: 'Product Reviews Enabled', type: 'boolean' },
      { key: 'REVIEW_REQUIRES_PURCHASE', label: 'Reviews Require Purchase', type: 'boolean' },
      { key: 'MAX_CART_ITEMS', label: 'Max Items per Cart', type: 'number', placeholder: '50' },
      { key: 'GOOGLE_ANALYTICS_ID', label: 'Google Analytics ID', type: 'text', placeholder: 'G-XXXXXXXXXX' },
      { key: 'GOOGLE_CLIENT_ID', label: 'Google Sign-In Client ID', type: 'text', placeholder: 'xxxxx.apps.googleusercontent.com', help: 'OAuth 2.0 Web client ID from Google Cloud Console → Credentials. Powers "Sign in with Google" on the website.' },
    ],
  },

  // ── API Integrations ──────────────────────────────────────────────────────
  {
    id: 'sms', label: 'SMS — Africa\'s Talking', icon: MessageSquare,
    settings: [
      { key: 'AT_USERNAME',  label: 'Username',   type: 'text',   placeholder: 'sandbox', help: 'Use "sandbox" for testing, your AT username for production' },
      { key: 'AT_API_KEY',   label: 'API Key',    type: 'secret', placeholder: 'ATxxxxxxxxxxxxxxxx', help: 'From your Africa\'s Talking dashboard → Settings → API Key' },
      { key: 'AT_SENDER_ID', label: 'Sender ID',  type: 'text',   placeholder: 'TotalStore', help: 'Alphanumeric sender name (max 11 chars) — must be approved in AT dashboard' },
    ],
  },
  {
    id: 'email', label: 'Email — SMTP', icon: Mail,
    settings: [
      { key: 'SMTP_HOST', label: 'SMTP Host', type: 'text',   placeholder: 'smtp.gmail.com', help: 'Gmail: smtp.gmail.com | Sendinblue: smtp-relay.brevo.com | Mailgun: smtp.mailgun.org' },
      { key: 'SMTP_PORT', label: 'SMTP Port', type: 'number', placeholder: '587', help: '587 for TLS/STARTTLS, 465 for SSL, 25 for plain' },
      { key: 'SMTP_USER', label: 'Username / Email', type: 'email', placeholder: 'noreply@totalstore.ug' },
      { key: 'SMTP_PASS', label: 'Password / App Password', type: 'secret', placeholder: '••••••••', help: 'For Gmail use an App Password (not your Google account password)' },
      { key: 'SMTP_FROM_NAME',  label: 'Sender Name',  type: 'text',  placeholder: 'TotalStore' },
      { key: 'SMTP_FROM_EMAIL', label: 'Sender Email', type: 'email', placeholder: 'noreply@totalstore.ug' },
    ],
  },
  {
    id: 'whatsapp', label: 'WhatsApp — Twilio', icon: MessageSquare,
    settings: [
      { key: 'TWILIO_ACCOUNT_SID',    label: 'Account SID',    type: 'secret', placeholder: 'ACxxxxxxxxxxxxxxxx', help: 'Found in your Twilio Console dashboard' },
      { key: 'TWILIO_AUTH_TOKEN',     label: 'Auth Token',     type: 'secret', placeholder: '••••••••', help: 'Found in your Twilio Console dashboard' },
      { key: 'TWILIO_WHATSAPP_FROM',  label: 'WhatsApp From',  type: 'text',   placeholder: 'whatsapp:+14155238886', help: 'The Twilio sandbox or approved WhatsApp sender number, prefixed with "whatsapp:"' },
    ],
  },
  {
    id: 'push', label: 'Push — Firebase FCM', icon: Bell,
    settings: [
      { key: 'FIREBASE_PROJECT_ID',    label: 'Project ID',     type: 'text',   placeholder: 'totalstore-ug', help: 'From Firebase Console → Project Settings → General' },
      { key: 'FIREBASE_CLIENT_EMAIL',  label: 'Client Email',   type: 'email',  placeholder: 'firebase-adminsdk@totalstore-ug.iam.gserviceaccount.com', help: 'From the service account JSON file' },
      { key: 'FIREBASE_PRIVATE_KEY',   label: 'Private Key',    type: 'secret', placeholder: '-----BEGIN PRIVATE KEY-----\n...', help: 'The full private key string from the service account JSON. Include the BEGIN/END lines.' },
    ],
  },
  {
    id: 'payments', label: 'Payment Gateways', icon: CreditCard,
    settings: [
      { key: 'MTN_MOMO_ENV',              label: 'MTN MoMo Environment', type: 'text',   placeholder: 'sandbox', help: '"sandbox" for testing, "production" for live' },
      { key: 'MTN_MOMO_PRIMARY_KEY',      label: 'MTN Primary Key',      type: 'secret', placeholder: '••••••••', help: 'From MTN MoMo Developer Portal → API User' },
      { key: 'MTN_MOMO_SECONDARY_KEY',    label: 'MTN Secondary Key',    type: 'secret', placeholder: '••••••••' },
      { key: 'MTN_MOMO_API_USER',         label: 'MTN API User ID',      type: 'text',   placeholder: 'UUID from portal' },
      { key: 'MTN_MOMO_API_KEY',          label: 'MTN API Key',          type: 'secret', placeholder: '••••••••' },
      { key: 'AIRTEL_CLIENT_ID',          label: 'Airtel Client ID',     type: 'text',   placeholder: 'from Airtel Developer Portal' },
      { key: 'AIRTEL_CLIENT_SECRET',      label: 'Airtel Client Secret', type: 'secret', placeholder: '••••••••' },
      { key: 'AIRTEL_ENV',                label: 'Airtel Environment',   type: 'text',   placeholder: 'sandbox', help: '"sandbox" or "production"' },
      { key: 'PESAPAL_CONSUMER_KEY',      label: 'Pesapal Consumer Key',    type: 'secret', placeholder: 'TNQBPXBFgI/...', help: 'From your Pesapal merchant account email' },
      { key: 'PESAPAL_CONSUMER_SECRET',   label: 'Pesapal Consumer Secret', type: 'secret', placeholder: '••••••••',         help: 'From your Pesapal merchant account email' },
      { key: 'PESAPAL_ENVIRONMENT',       label: 'Pesapal Environment',     type: 'text',   placeholder: 'sandbox',           help: '"sandbox" → cybqa.pesapal.com | "live" → pay.pesapal.com' },
      { key: 'PESAPAL_IPN_URL',           label: 'Pesapal IPN URL',         type: 'url',    placeholder: 'https://api.example.com/api/v1/payments/ipn', help: 'Must be publicly reachable (not localhost). Pesapal will POST/GET payment status updates here.' },
    ],
  },
  {
    id: 'oauth', label: 'Social Login', icon: Key,
    settings: [
      { key: 'GOOGLE_CLIENT_ID',     label: 'Google Client ID',         type: 'secret', placeholder: 'xxxxxxxxxxxx.apps.googleusercontent.com', help: 'From Google Cloud Console → APIs & Services → Credentials. Used for "Sign in with Google" on the storefront.' },
      { key: 'GOOGLE_CLIENT_SECRET', label: 'Google Client Secret',     type: 'secret', placeholder: 'GOCSPX-…', help: 'Keep secret — never expose this in the browser.' },
      { key: 'FACEBOOK_APP_ID',      label: 'Facebook App ID',          type: 'text',   placeholder: '1234567890',    help: 'From developers.facebook.com → Your App → Settings → Basic' },
      { key: 'FACEBOOK_APP_SECRET',  label: 'Facebook App Secret',      type: 'secret', placeholder: '••••••••',       help: 'Keep secret — never expose this in the browser.' },
      { key: 'APPLE_CLIENT_ID',      label: 'Apple Service ID',         type: 'text',   placeholder: 'com.totalstore.app', help: 'Apple "Sign in with Apple" Service ID from developer.apple.com' },
      { key: 'APPLE_TEAM_ID',        label: 'Apple Team ID',            type: 'text',   placeholder: 'XXXXXXXXXX' },
    ],
  },
  {
    id: 'maps', label: 'Maps & Tracking', icon: MapPin,
    settings: [
      { key: 'GOOGLE_MAPS_API_KEY', label: 'Google Maps API Key', type: 'secret', placeholder: 'AIzaSy…', help: 'Required for rider GPS tracking, delivery routing, and address auto-detection on mobile apps and checkout. Get it from Google Cloud Console → Maps SDK for Android/iOS + Geocoding API.' },
      { key: 'DEFAULT_LATITUDE',    label: 'Default Map Center — Latitude',  type: 'number', placeholder: '0.3476',  help: 'Latitude shown when no specific location is available (e.g. 0.3476 for Kampala, Uganda)' },
      { key: 'DEFAULT_LONGITUDE',   label: 'Default Map Center — Longitude', type: 'number', placeholder: '32.5825', help: 'Longitude shown when no specific location is available (e.g. 32.5825 for Kampala, Uganda)' },
    ],
  },
  {
    id: 'fcm_app', label: '3rd-Party Keys', icon: Key,
    settings: [
      { key: 'SENTRY_DSN',       label: 'Sentry DSN',            type: 'url',  placeholder: 'https://…@sentry.io/…', help: 'Error monitoring — leave blank to disable Sentry' },
      { key: 'ANALYTICS_GTAG',   label: 'Google Analytics Tag',  type: 'text', placeholder: 'G-XXXXXXXXXX' },
      { key: 'FACEBOOK_PIXEL_ID', label: 'Facebook Pixel ID',    type: 'text', placeholder: '1234567890' },
    ],
  },
];

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('general');
  const [values, setValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const { data: settingsArr, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: adminApi.getSettings,
  });

  useEffect(() => {
    if (settingsArr) {
      const map: Record<string, string> = {};
      (settingsArr as any[]).forEach((s: any) => { map[s.key] = s.value; });
      setValues(map);
    }
  }, [settingsArr]);

  const saveSingleMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      adminApi.updateSetting(key, value),
    onSuccess: (_, { key }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      setDirty((prev) => { const n = new Set(prev); n.delete(key); return n; });
      toast.success('Saved');
    },
    onError: () => toast.error('Failed to save'),
  });

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setDirty((prev) => new Set(prev).add(key));
  };

  const saveGroup = async (groupId: string) => {
    const group = GROUPS.find((g) => g.id === groupId);
    if (!group) return;
    const dirtyKeys = group.settings.filter((s) => dirty.has(s.key));
    if (!dirtyKeys.length) { toast('No changes to save'); return; }
    setSaving(true);
    try {
      await Promise.all(dirtyKeys.map((s) => adminApi.updateSetting(s.key, values[s.key] || '')));
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      setDirty((prev) => { const n = new Set(prev); dirtyKeys.forEach((s) => n.delete(s.key)); return n; });
      toast.success(`${group.label} settings saved`);
    } catch {
      toast.error('Failed to save');
    } finally { setSaving(false); }
  };

  const activeGroup = GROUPS.find((g) => g.id === activeTab)!;
  const groupDirtyCount = activeGroup.settings.filter((s) => dirty.has(s.key)).length;

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Site Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Customise every aspect of your store</p>
        </div>
        {dirty.size > 0 && (
          <span className="text-xs badge-warning border border-amber-300 px-3 py-1 rounded-full">
            {dirty.size} unsaved change{dirty.size !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <nav className="w-44 flex-shrink-0">
          {GROUPS.map((group) => {
            const Icon = group.icon;
            const gDirty = group.settings.filter((s) => dirty.has(s.key)).length;
            return (
              <button key={group.id} onClick={() => setActiveTab(group.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium mb-1 transition-colors ${
                  activeTab === group.id ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'text-slate-600 hover:bg-slate-100'
                }`}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">{group.label}</span>
                {gDirty > 0 && <span className="w-2 h-2 rounded-full bg-amber-400" />}
              </button>
            );
          })}
        </nav>

        {/* Panel */}
        <div className="flex-1 card border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-5 pb-4 border-b">
            <div className="flex items-center gap-2">
              {(() => { const Icon = activeGroup.icon; return <Icon className="w-5 h-5 text-primary-500" />; })()}
              <h2 className="font-semibold text-slate-900">{activeGroup.label}</h2>
            </div>
            <button onClick={() => saveGroup(activeTab)} disabled={saving || groupDirtyCount === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                groupDirtyCount > 0 && !saving ? 'bg-primary-600 text-white hover:bg-primary-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}>
              {saving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save{groupDirtyCount > 0 ? ` (${groupDirtyCount})` : ''}
            </button>
          </div>

          <div className="space-y-6">
            {activeGroup.settings.map(({ key, label, type, placeholder, help }) => (
              <div key={key}>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-sm font-medium text-slate-700">{label}</label>
                  {dirty.has(key) && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                </div>
                {help && <p className="text-xs text-slate-400 mb-2">{help}</p>}

                {type === 'secret' ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      value={values[key] || ''}
                      onChange={(e) => handleChange(key, e.target.value)}
                      placeholder={placeholder}
                      autoComplete="new-password"
                      className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-300"
                    />
                    <button onClick={() => saveSingleMutation.mutate({ key, value: values[key] || '' })} disabled={!dirty.has(key)}
                      className={`p-2 rounded-lg flex-shrink-0 transition-colors ${dirty.has(key) ? 'text-primary-500 hover:bg-sky-50' : 'text-slate-300 cursor-not-allowed'}`}>
                      <Save className="w-4 h-4" />
                    </button>
                  </div>
                ) : type === 'boolean' ? (
                  <button onClick={() => handleChange(key, values[key] === 'true' ? 'false' : 'true')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${values[key] === 'true' ? 'bg-sky-500' : 'bg-slate-200'}`}>
                    <span className={`inline-block w-4 h-4 bg-white rounded-full transition-transform ${values[key] === 'true' ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                ) : type === 'color' ? (
                  <div className="flex items-center gap-3">
                    <input type="color" value={values[key] || '#000000'}
                      onChange={(e) => handleChange(key, e.target.value)}
                      className="w-10 h-10 p-0.5 border border-slate-200 rounded-lg cursor-pointer" />
                    <input type="text" value={values[key] || ''} onChange={(e) => handleChange(key, e.target.value)}
                      placeholder="#000000" className="w-32 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-300" />
                    {values[key] && <div className="w-8 h-8 rounded-lg border border-slate-200" style={{ backgroundColor: values[key] }} />}
                    <button onClick={() => saveSingleMutation.mutate({ key, value: values[key] || '' })} disabled={!dirty.has(key)}
                      className={`p-2 rounded-lg transition-colors ${dirty.has(key) ? 'text-primary-500 hover:bg-sky-50' : 'text-slate-300 cursor-not-allowed'}`}>
                      <Save className="w-4 h-4" />
                    </button>
                  </div>
                ) : type === 'image' ? (
                  <div className="space-y-2">
                    <MediaUpload
                      label=""
                      value={values[key] || ''}
                      onChange={(url) => { handleChange(key, url); saveSingleMutation.mutate({ key, value: url }); }}
                      accept="image/*"
                      compact
                    />
                    {values[key] && (
                      <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <img src={values[key]} alt="" className="h-10 w-auto object-contain rounded"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        <span className="text-xs text-slate-400 break-all flex-1 font-mono">{values[key]}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input type={type === 'phone' ? 'tel' : type} value={values[key] || ''} onChange={(e) => handleChange(key, e.target.value)}
                      placeholder={placeholder}
                      className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300" />
                    <button onClick={() => saveSingleMutation.mutate({ key, value: values[key] || '' })} disabled={!dirty.has(key)}
                      className={`p-2 rounded-lg flex-shrink-0 transition-colors ${dirty.has(key) ? 'text-primary-500 hover:bg-sky-50' : 'text-slate-300 cursor-not-allowed'}`}>
                      <Save className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
