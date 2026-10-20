import { Tab, Tabs } from "@mui/material";
import { ATTR, attrText } from "@parts-warehouse/shared";
import { usePreviewTab } from "../../model/usePreviewTab";
import { useSelectedPart } from "../../PartsProvider";
import { ImagePreview } from "./ImagePreview";
import { StlViewer } from "./StlViewer";

const tabsSx = { minHeight: 40, mb: 1, "& .MuiTab-root": { minHeight: 40, py: 0 } };

/**
 * Right column. Parts with an STL get "3D model" and "Image" tabs (opening
 * on the last tab picked when both exist); others just the image panel.
 * Keyed by part code in PartView, so each part starts on its own default.
 */
export function PartPreview() {
  const { part, previewColours } = useSelectedPart();
  const hasModel = !!part && attrText(part, ATTR.filePath) != null;
  const [tab, setTab] = usePreviewTab(hasModel, !!part?.image);
  if (!part) return null;
  if (!hasModel) return <ImagePreview />;

  return (
    <>
      <Tabs value={tab} onChange={(_e, next) => setTab(next)} sx={tabsSx}>
        <Tab value="model" label="3D model" />
        <Tab value="image" label="Image" />
      </Tabs>
      {tab === "model" ? (
        <StlViewer
          code={part.code}
          colour={attrText(part, ATTR.colour) ?? ""}
          colours={previewColours}
        />
      ) : (
        <ImagePreview />
      )}
    </>
  );
}
