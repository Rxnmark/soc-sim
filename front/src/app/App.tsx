import React from 'react';
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { LanguageProvider } from "../context/LanguageContext";
import { SimControlPanel } from "./components/sim-control-panel";

export default function App() {
  return (
    <LanguageProvider>
      <SimControlPanel />
      <RouterProvider router={router} />
    </LanguageProvider>
  );
}
