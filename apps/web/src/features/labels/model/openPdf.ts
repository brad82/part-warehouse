/**
 * Shows `pdf` in a new tab, where the browser's PDF viewer prints it at its
 * real size (⌘P). Safari won't print a PDF from an iframe (it prints the
 * frame's empty box), so no auto-print. Call it straight from the click:
 * the tab opens before the first await, or pop-up blocking stops it.
 */
export async function openPdf(pdf: Promise<Blob>): Promise<void> {
  const tab = window.open("", "_blank");
  if (!tab) throw new Error("Allow pop-ups for this site to open the label PDF.");
  try {
    const url = URL.createObjectURL(await pdf);
    tab.location.href = url;
    // The viewer has loaded it well before then.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (e) {
    tab.close();
    throw e;
  }
}
