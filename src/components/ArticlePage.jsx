import { useParams } from 'react-router-dom'
import Article from './Article'

export default function ArticlePage() {
  const { id } = useParams()
  return <Article key={id} docId={id} />
}
