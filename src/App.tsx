import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import PlaceOrder from "./pages/PlaceOrder";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<PlaceOrder />} />
            <Route path="*" element={<PlaceOrder />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
  </QueryClientProvider>
);

export default App;
