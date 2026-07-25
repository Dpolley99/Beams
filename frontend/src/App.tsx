import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'

// One route for now -- add more <Route> entries here as you build
// out additional pages (e.g. a saved-projects list, a comparison view).
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  )
}
