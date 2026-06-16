import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import RoomList from '@/pages/RoomList';
import Calendar from '@/pages/Calendar';
import BookingList from '@/pages/BookingList';
import Reports from '@/pages/Reports';
import GuestList from '@/pages/GuestList';
import GuestDetail from '@/pages/GuestDetail';
import CleaningTaskList from '@/pages/CleaningTaskList';
import StoreList from '@/pages/StoreList';
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
          <Route path="/stores" element={<StoreList />} />
          <Route path="/rooms" element={<RoomList />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/bookings" element={<BookingList />} />
          <Route path="/cleaning-tasks" element={<CleaningTaskList />} />
          <Route path="/guests" element={<GuestList />} />
          <Route path="/guests/:phone" element={<GuestDetail />} />
          <Route path="/reports" element={<Reports />} />
        </Route>
      </Routes>
    </Router>
  );
}
