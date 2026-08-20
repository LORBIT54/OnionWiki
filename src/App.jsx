import Header from './components/Header'
import Article from './components/Article'
import Footer from './components/Footer'
import FloatNav from './components/FloatNav'
import './wiki.css'

export default function App() {
  return (
    <div className="wiki-app">
      <Header />
      <div className="wiki-body">
        <Article />
      </div>
      <Footer />
      <FloatNav />
    </div>
  )
}
