import Header from './Header';

export default function DashboardLayout({ children, onLogout }) {
  return (
    <div className="dash-root">
      <Header onLogout={onLogout} />
      <main className="dash-main">
        {children}
      </main>
    </div>
  );
}
