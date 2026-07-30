export type PublicPlanKey = 'starter' | 'standard' | 'premium';
export type FeatureAvailability = 'yes' | 'no' | 'addon' | 'limited';

export type PublicPlan = {
  key: PublicPlanKey;
  name: string;
  tagline: string;
  description: string;
  idealFor: string;
  popular?: boolean;
  highlights: string[];
};

export type ComparisonFeature = {
  name: string;
  note?: string;
  starter: FeatureAvailability;
  standard: FeatureAvailability;
  premium: FeatureAvailability;
};

export type ComparisonGroup = {
  name: string;
  features: ComparisonFeature[];
};

export const publicPlans: PublicPlan[] = [
  {
    key: 'starter',
    name: 'Starter',
    tagline: 'Essential school administration',
    description:
      'A dependable foundation for schools moving learner, attendance and fee records out of paper files and spreadsheets.',
    idealFor: 'Small schools beginning their digital transition',
    highlights: [
      'Learner, staff and guardian records',
      'Basic attendance and fee collection',
      'Receipts, announcements and core reports',
      'Role-based access for authorised staff',
    ],
  },
  {
    key: 'standard',
    name: 'Standard',
    tagline: 'Connected daily school operations',
    description:
      'The complete everyday operating system for schools that need academics, finance, staff, families and communication connected.',
    idealFor: 'Growing primary and secondary schools',
    popular: true,
    highlights: [
      'Everything in Starter',
      'Automatic daily fees and arrears tracking',
      'Homework, results and parent access',
      'Staff attendance and internal messaging',
    ],
  },
  {
    key: 'premium',
    name: 'Premium',
    tagline: 'Complete school command centre',
    description:
      'Advanced control, approval, transport, reporting, mobile and offline tools for schools managing complex operations.',
    idealFor: 'Large schools and multi-department operations',
    highlights: [
      'Everything in Standard',
      'Proprietor approval and learner promotion',
      'Transport, advanced reports and AI insights',
      'Full mobile access and offline desktop sync',
    ],
  },
];

export const comparisonGroups: ComparisonGroup[] = [
  {
    name: 'Core administration',
    features: [
      { name: 'Learner records and profile photos', starter: 'yes', standard: 'yes', premium: 'yes' },
      { name: 'Staff records and user accounts', starter: 'yes', standard: 'yes', premium: 'yes' },
      { name: 'Parent and guardian records', starter: 'yes', standard: 'yes', premium: 'yes' },
      { name: 'Classes, subjects and school setup', starter: 'yes', standard: 'yes', premium: 'yes' },
      { name: 'Role-based permissions', starter: 'yes', standard: 'yes', premium: 'yes' },
    ],
  },
  {
    name: 'Attendance and finance',
    features: [
      { name: 'Learner attendance', starter: 'yes', standard: 'yes', premium: 'yes' },
      { name: 'Fee setup, payments and receipts', starter: 'yes', standard: 'yes', premium: 'yes' },
      { name: 'Automatic daily-fee charging', starter: 'no', standard: 'yes', premium: 'yes' },
      { name: 'Outstanding fees and arrears follow-up', starter: 'no', standard: 'yes', premium: 'yes' },
      { name: 'Financial adjustments and approvals', starter: 'no', standard: 'yes', premium: 'yes' },
      { name: 'Advanced finance reports and exports', starter: 'no', standard: 'limited', premium: 'yes' },
    ],
  },
  {
    name: 'Academics and families',
    features: [
      { name: 'Homework and learning materials', starter: 'no', standard: 'yes', premium: 'yes' },
      { name: 'Examination marks and results', starter: 'no', standard: 'yes', premium: 'yes' },
      { name: 'Academic review workflow', starter: 'no', standard: 'yes', premium: 'yes' },
      { name: 'Proprietor result approval', starter: 'no', standard: 'no', premium: 'yes' },
      { name: 'Learner promotion workflow', starter: 'no', standard: 'no', premium: 'yes' },
      { name: 'Parent and guardian portal', starter: 'no', standard: 'yes', premium: 'yes' },
      { name: 'Announcements, events and messaging', starter: 'limited', standard: 'yes', premium: 'yes' },
    ],
  },
  {
    name: 'Staff, safety and transport',
    features: [
      { name: 'Staff attendance', starter: 'no', standard: 'yes', premium: 'yes' },
      { name: 'Transport management', starter: 'no', standard: 'no', premium: 'yes' },
      { name: 'Smart ID cards and QR scanning', note: 'Optional Smart ID add-on', starter: 'addon', standard: 'addon', premium: 'addon' },
      { name: 'Gate verification and security controls', note: 'Optional Security add-on', starter: 'addon', standard: 'addon', premium: 'addon' },
      { name: 'Visitor and authorised pickup management', note: 'Optional Security add-on', starter: 'addon', standard: 'addon', premium: 'addon' },
    ],
  },
  {
    name: 'Access, intelligence and control',
    features: [
      { name: 'Basic school reports', starter: 'yes', standard: 'yes', premium: 'yes' },
      { name: 'Advanced reports and exports', starter: 'no', standard: 'limited', premium: 'yes' },
      { name: 'AI-assisted reports and academic insights', starter: 'no', standard: 'limited', premium: 'yes' },
      { name: 'Complete audit history', starter: 'no', standard: 'limited', premium: 'yes' },
      { name: 'Mobile app access', starter: 'limited', standard: 'yes', premium: 'yes' },
      { name: 'Offline desktop application', starter: 'no', standard: 'no', premium: 'yes' },
      { name: 'Desktop and mobile synchronisation', starter: 'no', standard: 'no', premium: 'yes' },
      { name: 'Priority implementation support', starter: 'no', standard: 'no', premium: 'yes' },
    ],
  },
];

export function normalisePublicPlan(value: string | undefined): PublicPlanKey {
  const key = String(value || '').toLowerCase();
  if (key === 'starter' || key === 'standard' || key === 'premium') return key;
  return 'standard';
}

export function getPublicPlan(key: PublicPlanKey) {
  return publicPlans.find((plan) => plan.key === key) ?? publicPlans[1];
}
