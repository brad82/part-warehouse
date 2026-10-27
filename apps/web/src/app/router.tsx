import { Suspense } from "react";
import { LinearProgress } from "@mui/material";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import { BomContainer } from "@features/bom";
import { DashboardContainer } from "@features/dashboard";
import { LabelEditorContainer } from "@features/label-editor";
import { PartsContainer } from "@features/parts";
import {
  BomStructureContainer,
  PreviewColoursContainer,
  PrintersContainer,
  SettingsContainer,
  SettingsLayout,
} from "@features/settings";

function LegacyPartRedirect() {
  const { code } = useParams();
  return <Navigate to={`/viewer/${code}`} replace />;
}

/** Keeps `?group=` so old filtered links land on the same rows. */
function LegacyCatalogRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/bom${search}`} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardContainer />} />
      <Route path="/viewer" element={<PartsContainer />} />
      <Route path="/viewer/:code" element={<PartsContainer />} />
      {/* Old links and bookmarks. */}
      <Route path="/parts/:code" element={<LegacyPartRedirect />} />
      <Route path="/dashboard" element={<Navigate to="/" replace />} />
      <Route path="/catalog" element={<LegacyCatalogRedirect />} />
      <Route path="/bom" element={<BomContainer />} />
      {/* Full-screen editor, outside the padded settings layout. */}
      <Route
        path="/settings/label-templates"
        element={
          <Suspense fallback={<LinearProgress sx={{ flex: 1 }} />}>
            <LabelEditorContainer />
          </Suspense>
        }
      />
      <Route path="/settings" element={<SettingsLayout />}>
        <Route index element={<SettingsContainer />} />
        <Route path="bom" element={<BomStructureContainer />} />
        <Route path="stl-preview" element={<PreviewColoursContainer />} />
        <Route path="devices" element={<PrintersContainer />} />
      </Route>
    </Routes>
  );
}
