// Converts the HTML string returned by /api/generate-report into a real,
// multi-page PDF file and triggers a direct browser download — no print
// dialog, no "Save as PDF" step. Renders the HTML off-screen in a hidden
// iframe (so its own <style> tags apply cleanly without colliding with the
// app's Tailwind styles), rasterizes it with html2canvas, then slices the
// result into A4 pages with jsPDF.
export async function downloadReportAsPdf(html: string, filename: string): Promise<void> {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ])

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.top = '-10000px'
  iframe.style.left = '-10000px'
  iframe.style.width = '794px' // ~210mm at 96dpi, matches the report's .page max-width
  iframe.style.height = '1px'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  try {
    await new Promise<void>((resolve, reject) => {
      const doc = iframe.contentDocument
      if (!doc) { reject(new Error('Could not prepare report for export.')); return }
      doc.open()
      doc.write(html)
      doc.close()
      // Give web fonts / layout a moment to settle before measuring height.
      iframe.onload = () => setTimeout(resolve, 150)
      setTimeout(resolve, 800) // fallback in case onload doesn't fire reliably cross-browser
    })

    const target = iframe.contentDocument?.body
    if (!target) throw new Error('Report content was empty.')

    iframe.style.height = `${target.scrollHeight}px`

    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      windowWidth: 794,
    })

    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = 210
    const pageHeight = 297
    const imgWidth = pageWidth
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    const imgData = canvas.toDataURL('image/png')

    let heightLeft = imgHeight
    let position = 0

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    while (heightLeft > 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    pdf.save(filename)
  } finally {
    document.body.removeChild(iframe)
  }
}
