import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import FloatNav from './FloatNav'

export default function Layout() {
  return (
    <div className="wiki-app">
      <Header />
      <div className="wiki-body">
        <Outlet />
      </div>
      <Footer />
      <FloatNav />
    </div>
  )
}
