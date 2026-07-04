import '../../styles/app.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Route, Routes, useLocation } from 'react-router-dom';
import { getPathMapping, stringToSlug } from '../../utils';
import { useEffect } from 'react';
import { Navbar } from '../../components/Navbar';
import { Header } from '../../components/Header';
import { NotFound } from '../../components/NotFound';
import { Footer } from '../../components/Footer';

const App = () => {
  const pathMapping = getPathMapping();
  const location = useLocation();
  const currentPath =
    location.pathname
      .split(`${stringToSlug(import.meta.env.VITE_TEAM_NAME)}`)
      .pop() || '/';

  const isHome = currentPath === '/' || currentPath === '';

  // Set Page Title
  const title =
    currentPath in pathMapping ? pathMapping[currentPath].title : 'Not Found';

  useEffect(() => {
    document.title = `${title || ''} | ${import.meta.env.VITE_TEAM_NAME} - iGEM ${import.meta.env.VITE_TEAM_YEAR}`;
  }, [title]);

  useEffect(() => {
    document.body.classList.toggle('is-cinematic-home', isHome);
    document.body.classList.toggle('is-wiki-page', !isHome);
  }, [isHome]);

  return (
    <>
      {/* Navbar — hidden on cinematic Home for now; component kept for other pages */}
      {!isHome && <Navbar />}

      <Routes>
        {Object.entries(pathMapping).map(
          ([path, { title: pageTitle, lead, component: Component }]) =>
            path === '/' ? (
              <Route key={path} path={path} element={<Component />} />
            ) : (
              <Route
                key={path}
                path={path}
                element={
                  <>
                    <Header title={pageTitle || ''} lead={lead || ''} />
                    <div className="container">
                      <Component />
                    </div>
                  </>
                }
              />
            ),
        )}
        <Route
          path="*"
          element={
            <>
              <Header
                title="Not Found"
                lead="The requested URL was not found on this server."
              />
              <NotFound />
            </>
          }
        />
      </Routes>

      <Footer />
    </>
  );
};

export default App;
