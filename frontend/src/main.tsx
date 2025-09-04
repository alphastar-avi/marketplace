import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'

import Home from './routes/Home'
import MarketplaceRoute from './routes/Marketplace'
import ProductRoute from './routes/Product'
import ProfileRoute from './routes/Profile'
import ListItemRoute from './routes/ListItem'
import ChatsRoute from './routes/Chats'
import AuthCallback from './routes/AuthCallback'
import Login from './routes/Login'
import Signup from './routes/Signup'

import { MarketplaceProvider } from './state/MarketplaceContext'
import { ThemeProvider } from './state/ThemeContext'

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/login', element: <Login /> },
  { path: '/signup', element: <Signup /> },
  { path: '/marketplace', element: <MarketplaceRoute /> },
  { path: '/product/:id', element: <ProductRoute /> },
  { path: '/profile', element: <ProfileRoute /> },
  { path: '/list-item', element: <ListItemRoute /> },
  { path: '/chats', element: <ChatsRoute /> },
  { path: '/auth/callback', element: <AuthCallback /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <MarketplaceProvider>
        <RouterProvider router={router} />
      </MarketplaceProvider>
    </ThemeProvider>
  </StrictMode>,
)
