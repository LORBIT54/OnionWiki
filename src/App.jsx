import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Article from './components/Article'
import ArticlePage from './components/ArticlePage'
import RecentPage from './components/RecentPage'
import SearchPage from './components/SearchPage'
import HistoryPage from './components/HistoryPage'
import RevisionPage from './components/RevisionPage'
import './wiki.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/recent" replace />} />
          <Route path="/recent" element={<RecentPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/new" element={<Article isNew />} />
          <Route path="/w/:id/history" element={<HistoryPage />} />
          <Route path="/w/:id/r/:revId" element={<RevisionPage />} />
          <Route path="/w/:id" element={<ArticlePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
