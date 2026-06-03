'use client';

import Link from 'next/link';
import { Briefcase, Users, TrendingUp, Heart } from 'lucide-react';
import { useSettings } from '@/contexts/settings';

const DEFAULT_POSITIONS = [
  { title: 'Senior Backend Engineer (NestJS)', dept: 'Engineering', location: 'Remote / Africa', type: 'Full-time' },
  { title: 'Mobile Developer (Flutter)', dept: 'Engineering', location: 'Remote / Africa', type: 'Full-time' },
  { title: 'Product Designer (UI/UX)', dept: 'Design', location: 'Remote', type: 'Full-time' },
  { title: 'Digital Marketing Manager', dept: 'Marketing', location: 'Remote / Africa', type: 'Full-time' },
  { title: 'Customer Support Specialist', dept: 'Support', location: 'Remote / Africa', type: 'Full-time' },
  { title: 'Logistics & Rider Coordinator', dept: 'Operations', location: 'Remote / Africa', type: 'Full-time' },
  { title: 'Data Analyst', dept: 'Data', location: 'Remote / Africa', type: 'Full-time' },
  { title: 'Seller Partnerships Manager', dept: 'Business Dev', location: 'Remote / Africa', type: 'Full-time' },
];

const DEFAULT_BENEFITS = [
  'Competitive salary', 'Health insurance', 'Flexible hours',
  'Remote-friendly', 'Annual bonus', 'Paid leave (28 days)',
  'Learning budget (UGX 1M/yr)', 'Team retreats', 'Free lunch on Fridays',
];

const DEPT_COLORS: Record<string, string> = {
  Engineering: 'bg-sky-100 text-sky-700',
  Design: 'bg-purple-100 text-purple-700',
  Marketing: 'bg-pink-100 text-pink-700',
  Support: 'bg-green-100 text-green-700',
  Operations: 'bg-orange-100 text-orange-700',
  Data: 'bg-amber-100 text-amber-700',
  'Business Dev': 'bg-teal-100 text-teal-700',
};

export default function CareersPage() {
  const settings = useSettings();
  const careersEmail = settings.PAGE_CAREERS_EMAIL || 'careers@totalstore.ug';
  const positions = (() => {
    try { return settings.PAGE_CAREERS_POSITIONS_JSON ? JSON.parse(settings.PAGE_CAREERS_POSITIONS_JSON) : DEFAULT_POSITIONS; }
    catch { return DEFAULT_POSITIONS; }
  })();
  const benefits = (() => {
    try { return settings.PAGE_CAREERS_BENEFITS_JSON ? JSON.parse(settings.PAGE_CAREERS_BENEFITS_JSON) : DEFAULT_BENEFITS; }
    catch { return DEFAULT_BENEFITS; }
  })();

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block bg-sky-500/20 text-sky-300 text-xs font-semibold px-3 py-1 rounded-full mb-4">
            We're hiring!
          </span>
          <h1 className="text-4xl font-bold mb-4">Build Africa's #1 Marketplace</h1>
          <p className="text-slate-300 text-base max-w-xl mx-auto">
            Join a passionate team building technology that empowers thousands of sellers and millions of buyers across East Africa.
          </p>
          <a href="#openings" className="inline-block mt-6 bg-sky-500 hover:bg-sky-600 text-white font-semibold px-7 py-3 rounded-xl transition text-sm">
            View Open Positions
          </a>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-14 space-y-14">
        {/* Values */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">Why TotalStore?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: 'bolt', title: 'Move Fast', desc: 'We ship products weekly and celebrate speed without sacrificing quality.' },
              { icon: 'globe', title: 'Real Impact', desc: 'Power livelihoods of thousands of small business owners across Africa.' },
              { icon: 'chart', title: 'Grow With Us', desc: 'Early employees get equity, learning budgets, and promotion opportunities.' },
              { icon: 'users', title: 'Great Team', desc: 'Work with talented, kind people who care deeply about their work and each other.' },
            ].map((v) => (
              <div key={v.title} className="bg-white rounded-2xl shadow-sm p-5 text-center">
                <div className="flex justify-center mb-3">
                  {v.icon === 'bolt' && <svg className="w-8 h-8 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>}
                  {v.icon === 'globe' && <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253M3.157 7.582A8.959 8.959 0 003 12a8.959 8.959 0 00.284 2.253" /></svg>}
                  {v.icon === 'chart' && <svg className="w-8 h-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>}
                  {v.icon === 'users' && <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>}
                </div>
                <h3 className="font-semibold text-slate-800 mb-1.5">{v.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" /> Benefits & Perks
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {benefits.map((b: string) => (
              <div key={b} className="flex items-center gap-2 text-sm text-slate-700">
                <div className="w-2 h-2 bg-sky-400 rounded-full flex-shrink-0" />
                {b}
              </div>
            ))}
          </div>
        </div>

        {/* Open positions */}
        <div id="openings">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-sky-500" /> Open Positions
          </h2>
          <div className="space-y-3">
            {positions.map((pos: any) => (
              <div key={pos.title} className="bg-white rounded-2xl shadow-sm p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{pos.title}</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${DEPT_COLORS[pos.dept] || 'bg-slate-100 text-slate-600'}`}>
                      {pos.dept}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">{pos.location}</span>
                    <span className="text-xs text-slate-500">{pos.type}</span>
                  </div>
                </div>
                <a
                  href={`mailto:${careersEmail}?subject=Application: ${pos.title}`}
                  className="btn-primary text-sm px-5 py-2.5 rounded-xl font-medium whitespace-nowrap"
                >
                  Apply Now
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-br from-sky-600 to-sky-800 rounded-2xl p-8 text-center text-white">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-80" />
          <h2 className="text-xl font-bold mb-2">Don't see your role?</h2>
          <p className="text-sky-200 text-sm mb-5 max-w-sm mx-auto">
            We're always open to talented people. Send us your CV and tell us how you'd like to contribute.
          </p>
          <a
            href={`mailto:${careersEmail}`}
            className="inline-block bg-white text-sky-700 font-semibold px-7 py-3 rounded-xl text-sm hover:bg-sky-50 transition"
          >
            Send Open Application
          </a>
        </div>
      </div>
    </div>
  );
}
