import { useAuth } from '../auth/AuthContext.jsx';
import { AppLayout } from '../layouts/AppLayout.jsx';

export default function Benchmarks() {
  const { user } = useAuth();

  const benchmarkCategories = [
    {
      title: 'Social Media Advertising',
      icon: '📱',
      metrics: [
        { label: 'Average CTR', value: '1.5 - 3.5%', platform: 'Meta' },
        { label: 'Average CTR', value: '1.0 - 2.5%', platform: 'Google' },
        { label: 'Average CTR', value: '2.0 - 4.5%', platform: 'TikTok' },
        { label: 'Average CVR', value: '2.0 - 5.0%', platform: 'All Platforms' },
        { label: 'Average CPM', value: '$2 - $15', platform: 'Varies by audience' },
      ],
    },
    {
      title: 'E-commerce',
      icon: '🛍️',
      metrics: [
        { label: 'CTR Target', value: '2.0 - 4.0%', platform: 'All Platforms' },
        { label: 'CVR Target', value: '3.0 - 8.0%', platform: 'Industry average' },
        { label: 'ROAS Target', value: '3.0 - 5.0x', platform: 'Healthy range' },
        { label: 'CPC Range', value: '$0.50 - $3.00', platform: 'Competitive' },
      ],
    },
    {
      title: 'SaaS & Software',
      icon: '💻',
      metrics: [
        { label: 'CTR Target', value: '1.5 - 3.0%', platform: 'All Platforms' },
        { label: 'CVR Target', value: '1.0 - 3.0%', platform: 'Lead generation' },
        { label: 'ROAS Target', value: '2.0 - 4.0x', platform: 'Typical range' },
        { label: 'CAC', value: '$10 - $100', platform: 'Varies widely' },
      ],
    },
    {
      title: 'Education & Training',
      icon: '📚',
      metrics: [
        { label: 'CTR Target', value: '1.0 - 2.5%', platform: 'All Platforms' },
        { label: 'CVR Target', value: '0.5 - 2.0%', platform: 'Enrollment' },
        { label: 'ROAS Target', value: '2.0 - 3.5x', platform: 'Typical range' },
        { label: 'Cost per Lead', value: '$5 - $50', platform: 'Content marketing' },
      ],
    },
  ];

  const bestPractices = [
    {
      title: 'Test Creatives Regularly',
      description: 'Refresh ad creative every 2-4 weeks to combat fatigue. CTR typically drops 20-30% after 2-3 weeks without new variations.',
    },
    {
      title: 'Monitor Platform Changes',
      description: 'Algorithm updates and audience shifts can move benchmarks ±15%. Track weekly trends to spot anomalies early.',
    },
    {
      title: 'Consider Audience Quality',
      description: 'Cold audiences typically see 30-40% lower conversion rates than warm audiences. Adjust expectations accordingly.',
    },
    {
      title: 'Seasonal & Competitive Effects',
      description: 'CPM can spike 50-100% during peak seasons. Budget accordingly and plan campaigns around seasonal trends.',
    },
    {
      title: 'Device-Specific Optimization',
      description: 'Mobile CVR often 20-30% lower than desktop. Optimize landing pages for mobile-first experience.',
    },
    {
      title: 'Audience Targeting Precision',
      description: 'Narrow targeting improves CTR/CVR by 15-30% but limits scale. Balance precision with reach.',
    },
  ];

  return (
    <AppLayout userEmail={user?.email}>
      <main className="mx-auto max-w-6xl space-y-8 px-4 sm:px-6 py-8">
        {/* Page Header */}
        <div>
          <h1 className="heading-2">Industry Benchmarks</h1>
          <p className="mt-2 text-neutral-600">
            Understand how your campaigns compare to industry standards. Benchmarks vary by platform, industry, and audience quality.
          </p>
        </div>

        {/* Benchmark Categories */}
        <div className="space-y-6">
          <h2 className="heading-3">Performance Benchmarks by Industry</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {benchmarkCategories.map((category) => (
              <section key={category.title} className="card">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{category.icon}</span>
                  <h3 className="text-lg font-semibold text-neutral-900">{category.title}</h3>
                </div>
                <div className="space-y-3">
                  {category.metrics.map((metric, idx) => (
                    <div key={idx} className="flex items-start justify-between border-b border-neutral-100 pb-3 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{metric.label}</p>
                        <p className="text-xs text-neutral-500">{metric.platform}</p>
                      </div>
                      <p className="text-sm font-semibold text-primary-600">{metric.value}</p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        {/* Best Practices */}
        <div className="space-y-6">
          <h2 className="heading-3">Best Practices for Optimization</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bestPractices.map((practice, idx) => (
              <section key={idx} className="card">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-primary-600 font-semibold text-sm">{idx + 1}</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900">{practice.title}</h3>
                    <p className="mt-1 text-sm text-neutral-600">{practice.description}</p>
                  </div>
                </div>
              </section>
            ))}
          </div>
        </div>

        {/* Key Insights */}
        <div className="space-y-4">
          <h2 className="heading-3">Key Insights for Campaign Planning</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <section className="card bg-gradient-to-br from-primary-50 to-transparent">
              <h3 className="font-semibold text-neutral-900 mb-2">Platform Differences</h3>
              <p className="text-sm text-neutral-700">
                Meta favors engagement content with 2-4% CTR, Google focuses on intent with 1-2% CTR, and TikTok performs best with native, authentic content.
              </p>
            </section>
            <section className="card bg-gradient-to-br from-success-50 to-transparent">
              <h3 className="font-semibold text-neutral-900 mb-2">Healthy ROAS Range</h3>
              <p className="text-sm text-neutral-700">
                ROAS of 3:1 or higher is typically profitable. Most established campaigns range 2.5-5x. Below 1.5x usually signals optimization opportunities.
              </p>
            </section>
            <section className="card bg-gradient-to-br from-warning-50 to-transparent">
              <h3 className="font-semibold text-neutral-900 mb-2">Creative Fatigue Impact</h3>
              <p className="text-sm text-neutral-700">
                Plan to refresh creatives every 2-4 weeks as CTR naturally declines 20-30%. Budget 10-15% of spend for constant creative testing.
              </p>
            </section>
          </div>
        </div>

        {/* Footer Note */}
        <div className="bg-neutral-50 rounded-lg border border-neutral-200 p-4 text-sm text-neutral-600">
          <p>
            <strong>Note:</strong> These benchmarks are derived from industry averages and may vary significantly based on your target audience, 
            market conditions, and campaign specifics. Use these as a starting point and always compare against your own historical data for 
            the most accurate performance targets.
          </p>
        </div>
      </main>
    </AppLayout>
  );
}
