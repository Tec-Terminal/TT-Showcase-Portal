import LandingPage from '@/components/landing/LandingPage';

export default async function HomePage() {
  // Show landing page for everyone (no authentication required)
  return <LandingPage />;
}
