import '../styles/globals.css';
// import Layout from '../components/Layout';
import FiberLayout from '../components/FiberLayout';

function MyApp({ Component, pageProps }) {
  return (
    <FiberLayout>
      <Component {...pageProps} />
    </FiberLayout>
  );
}

export default MyApp;
