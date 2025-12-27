import '../globals.css';

export const metadata = {
  title: 'Attendify',
  description: 'Attendify class management system',
};

const RootLayout = ({ children }) => (
  <html lang="en">
    <body>{children}</body>
  </html>
);

export default RootLayout;
