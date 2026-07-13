export function Footer() {
  return (
    <footer className="app-footer">
      <div className="container">
        <p style={{ margin: 0 }}>
          OxyCost · All calculations run in your browser; no data leaves this page.
          Figures are planning estimates, not a substitute for procurement quotations.{' '}
          <strong>This tool provides information to support your own decisions — it is not a
          recommendation.</strong>
        </p>
        <p style={{ margin: '2px 0 0' }}>
          For support, please reach out to the developer at{' '}
          <a href="mailto:mchaurasiya@wjcf.in">mchaurasiya@wjcf.in</a>.
        </p>
      </div>
    </footer>
  )
}
