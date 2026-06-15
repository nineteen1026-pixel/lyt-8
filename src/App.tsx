import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import RoomList from '@/pages/RoomList';
import Calendar from '@/pages/Calendar';
import BookingList from '@/pages/BookingList';
import Reports from '@/pages/Reports';
import { useAppStore } from '@/store/useAppStore';

export default function App() {
  const initializeData = useAppStore((s) => s.initializeData);

  useEffect(() => {
    initializeData();
  }, [initializeData]);

  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/rooms" element={<RoomList />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/bookings" element={<BookingList />} />
          <Route path="/reports" element={<Reports />} />
        </Route>
      </Routes>
    </Router>
  );
}
