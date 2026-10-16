import { Route, Routes } from "react-router-dom";
import { CatalogContainer } from "@features/catalog";
import { PartsContainer } from "@features/parts";
import {
  PreviewColoursContainer,
  SettingsContainer,
  SettingsLayout,
} from "@features/settings";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PartsContainer />} />
      <Route path="/parts/:code" element={<PartsContainer />} />
      <Route path="/catalog" element={<CatalogContainer />} />
      <Route path="/settings" element={<SettingsLayout />}>
        <Route index element={<SettingsContainer />} />
        <Route path="stl-preview" element={<PreviewColoursContainer />} />
      </Route>
    </Routes>
  );
}
