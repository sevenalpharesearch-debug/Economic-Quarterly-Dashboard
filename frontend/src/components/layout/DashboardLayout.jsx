import Header from './Header';

export default function DashboardLayout({ children }) {
  return (
    <div className="dash-root">
      <Header />
      <main className="dash-main">
        {children}
      </main>
    </div>
  );
}
