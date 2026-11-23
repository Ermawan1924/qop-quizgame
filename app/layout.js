import './globals.css';
export const metadata = { title: 'QuizRoom', description: 'Live quizzes for the office' };
export default function RootLayout({ children }) {
  return (<html lang="en"><body>{children}</body></html>);
}
