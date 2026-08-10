import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ListingDetailPage from './pages/ListingDetailPage'
import NewListingPage from './pages/NewListingPage'
import EditListingPage from './pages/EditListingPage'
import MyListingsPage from './pages/MyListingsPage'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="listings/:id" element={<ListingDetailPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="listings/new" element={<NewListingPage />} />
          <Route path="listings/:id/edit" element={<EditListingPage />} />
          <Route path="my-listings" element={<MyListingsPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
