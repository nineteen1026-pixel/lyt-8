import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import RoomList from '@/pages/RoomList';
import Calendar from '@/pages/Calendar';
import BookingList from '@/pages/BookingList';
import WaitlistList from '@/pages/WaitlistList';
import Reports from '@/pages/Reports';
import GuestList from '@/pages/GuestList';
import GuestDetail from '@/pages/GuestDetail';
import CleaningTaskList from '@/pages/CleaningTaskList';
import StoreList from '@/pages/StoreList';
import AuditLogList from '@/pages/AuditLogList';
import LongTermContractList from '@/pages/LongTermContractList';
import { useAppStore } from '@/store/useAppStore';

function ProtectedRoute({ permission, children }: { permission?: import('@/types').Permission; children: React.ReactNode }) {
  const hasPermission = useAppStore((s) => s.hasPermission);
  if (permission && !hasPermission(permission)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

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
          <Route
            path="/stores"
            element={
              <ProtectedRoute permission="store:view">
                <StoreList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rooms"
            element={
              <ProtectedRoute permission="room:view">
                <RoomList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute permission="booking:view">
                <Calendar />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bookings"
            element={
              <ProtectedRoute permission="booking:view">
                <BookingList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/long-term"
            element={
              <ProtectedRoute permission="longterm:view">
                <LongTermContractList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/waitlist"
            element={
              <ProtectedRoute permission="waitlist:view">
                <WaitlistList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cleaning-tasks"
            element={
              <ProtectedRoute permission="cleaning:view">
                <CleaningTaskList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/guests"
            element={
              <ProtectedRoute permission="guest:view">
                <GuestList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/guests/:phone"
            element={
              <ProtectedRoute permission="guest:view">
                <GuestDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute permission="report:view">
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <ProtectedRoute permission="audit:view">
                <AuditLogList />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </Router>
  );
}
