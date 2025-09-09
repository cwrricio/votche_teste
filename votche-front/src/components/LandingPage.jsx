import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./styles/LandingPage.css";
import votcheLogo from "../assets/votche.png";
import imagemLanding from "../assets/imagemlanding.jpg";
// Importar ícones
import {
  FaVoteYea,
  FaChartPie,
  FaUserCheck,
  FaCog,
  FaShieldAlt,
  FaClock,
  FaLock,
  FaListAlt,
  FaChartBar,
  FaFileExport,
  FaFileAlt,
  FaUsers,
  // Novos ícones
  FaBan,
  FaChartLine,
  FaQrcode,
  FaMobileAlt,
  FaInstagram,
  FaTwitter,
  FaFacebook,
  FaLinkedin,
  FaArrowUp,
  FaBars, // Adicionado ícone de menu hambúrguer
  FaTimes, // Adicionado ícone para fechar
} from "react-icons/fa";

function LandingPage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleEnterApp = () => {
    navigate("/app");
  };

  const handleLogoClick = () => {
    navigate("/");
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  // Controla a rolagem do body quando o menu está aberto
  useEffect(() => {
    if (menuOpen) {
      document.body.classList.add("menu-open");
    } else {
      document.body.classList.remove("menu-open");
    }

    // Cleanup ao desmontar
    return () => {
      document.body.classList.remove("menu-open");
    };
  }, [menuOpen]);

  // Dentro da função LandingPage, adicione esta função para rolagem suave:
  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
      closeMenu();
    }
  };

  return (
    <div className="landing-container">
      <header className="landing-header">
        <div className="logo-container" onClick={handleLogoClick}>
          <img src={votcheLogo} alt="Votchê" className="landing-logo-img" />
        </div>

        {/* Menu de navegação principal - visível em desktops */}
        <nav className="landing-nav">
          <ul>
            <li>
              <a
                href="#sobre"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection("sobre");
                }}
              >
                Sobre
              </a>
            </li>
            <li>
              <a
                href="#como-funciona"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection("como-funciona");
                }}
              >
                Como funciona
              </a>
            </li>
            <li>
              <a
                href="#contato-section"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection("contato-section");
                }}
              >
                Contato
              </a>
            </li>
            <li>
              <button className="enter-button" onClick={handleEnterApp}>
                Entrar
              </button>
            </li>
          </ul>
        </nav>

        {/* Botão do menu hambúrguer - visível apenas em telas pequenas */}
        <div className="mobile-menu-toggle" onClick={toggleMenu}>
          {menuOpen ? <FaTimes /> : <FaBars />}
        </div>
      </header>

      {/* Menu de navegação SEPARADO e FORA do header */}
      <div className={`mobile-menu-wrapper ${menuOpen ? "open" : ""}`}>
        <nav className="landing-nav">
          <ul>
            <li className="enter-button-li">
              <button className="enter-button" onClick={handleEnterApp}>
                Entrar
              </button>
            </li>
            <li>
              <a
                href="#sobre"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection("sobre");
                  closeMenu();
                }}
              >
                Sobre
              </a>
            </li>
            <li>
              <a
                href="#como-funciona"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection("como-funciona");
                  closeMenu();
                }}
              >
                Como funciona
              </a>
            </li>
            <li>
              <a
                href="#contato-section"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection("contato-section");
                  closeMenu();
                }}
              >
                Contato
              </a>
            </li>
            
          </ul>
        </nav>
      </div>

      {/* Overlay SEPARADO e fora de qualquer container */}
      <div
        className={`menu-overlay ${menuOpen ? "open" : ""}`}
        onClick={closeMenu}
      ></div>

      <main className="landing-main">
        <div className="hero-container">
          <div className="hero-text">
            <h1>Sistema de Votação Online</h1>
            <h2>para Reuniões</h2>
            <p className="hero-subtitle">
              Acesse, vote e gere relatórios em tempo real.
            </p>
            <button className="cta-button" onClick={handleEnterApp}>
              Entrar na Reunião
            </button>
          </div>
          <div className="hero-image">
            <img src={imagemLanding} alt="Sistema de votação Votchê" />
          </div>
        </div>
      </main>

      {/* Seção "Sobre" reformulada */}
      <section className="about-section" id="sobre">
        <div className="section-wrapper">
          <div className="section-header"></div>

          <div className="about-content">
            <div className="about-text-content">
              <p>
                Uma plataforma digital que torna as votações em reuniões mais
                rápidas, transparentes e acessíveis para todos os participantes.
              </p>
              <p>
                Desenvolvido para atender assembleias, conselhos e comissões, o
                Votchê permite que cada membro vote diretamente de seu
                dispositivo, eliminando processos manuais e contagens demoradas.
              </p>
            </div>

            <div className="about-visual-content">
              <div className="results-chart">
                <div className="chart-header">
                  <h3>Resultado da Votação</h3>
                  <p>Pauta: Aprovação do Projeto X</p>
                </div>
                <div className="chart-body">
                  <div className="chart-item">
                    <div className="chart-label">Sim</div>
                    <div className="chart-bar">
                      <div className="chart-fill yes" style={{ width: "75%" }}>
                        75%
                      </div>
                    </div>
                  </div>
                  <div className="chart-item">
                    <div className="chart-label">Não</div>
                    <div className="chart-bar">
                      <div className="chart-fill no" style={{ width: "20%" }}>
                        20%
                      </div>
                    </div>
                  </div>
                  <div className="chart-item">
                    <div className="chart-label">Abstenção</div>
                    <div className="chart-bar">
                      <div
                        className="chart-fill abstain"
                        style={{ width: "5%" }}
                      >
                        5%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrap">
                <FaUserCheck className="feature-icon" />
              </div>
              <div className="feature-content">
                <h3>Votação Flexível</h3>
                <p>Opções de votação nominal ou anônima com total controle</p>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrap">
                <FaChartPie className="feature-icon" />
              </div>
              <div className="feature-content">
                <h3>Resultados Instantâneos</h3>
                <p>Visualize resultados em tempo real com gráficos dinâmicos</p>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrap">
                <FaShieldAlt className="feature-icon" />
              </div>
              <div className="feature-content">
                <h3>Segurança Garantida</h3>
                <p>Proteção de dados e integridade em cada voto registrado</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Seção "Como funciona" com cores do RS */}
      <section className="how-works-section" id="como-funciona">
        <div className="section-wrapper">
          <div className="section-header centered-header">
            <h2>Como funciona</h2>
            {/* Removido o subtítulo "Processo simplificado em poucos passos" */}
          </div>

          <div className="process-banner rs-colors">
            <div className="process-step">
              {/* Substituído o número pelo ícone */}
              <div className="step-icon-main">
                <FaFileAlt />
              </div>
              <div className="step-content">
                <h3>Crie uma reunião</h3>
                <p>
                  Configure sua reunião em poucos cliques, definindo pautas e
                  participantes
                </p>
              </div>
              <div className="step-arrow">
                <div className="arrow-line"></div>
                <div className="arrow-head"></div>
              </div>
            </div>

            <div className="process-step">
              {/* Substituído o número pelo ícone */}
              <div className="step-icon-main">
                <FaUsers />
              </div>
              <div className="step-content">
                <h3>Compartilhe o acesso</h3>
                <p>
                  Envie o link ou código aos participantes para acessarem de
                  qualquer dispositivo
                </p>
              </div>
              <div className="step-arrow">
                <div className="arrow-line"></div>
                <div className="arrow-head"></div>
              </div>
            </div>

            <div className="process-step">
              {/* Substituído o número pelo ícone */}
              <div className="step-icon-main">
                <FaVoteYea />
              </div>
              <div className="step-content">
                <h3>Realize a votação</h3>
                <p>
                  Os participantes votam facilmente e o sistema contabiliza os
                  resultados
                </p>
              </div>
            </div>
          </div>

          {/* Seção com mais destaque */}
          <div className="how-works-details highlighted">
            <div className="details-content">
              <h3 className="centered-title">
                Votação simplificada para qualquer reunião
              </h3>
              <ul className="details-list">
                <li>
                  <div className="check-icon">
                    <FaLock />
                  </div>
                  <p>Crie reuniões públicas ou privadas com senha</p>
                </li>
                <li>
                  <div className="check-icon">
                    <FaListAlt />
                  </div>
                  <p>Defina múltiplas pautas para votação</p>
                </li>
                <li>
                  <div className="check-icon">
                    <FaChartBar />
                  </div>
                  <p>Acompanhe resultados em tempo real</p>
                </li>
                <li>
                  <div className="check-icon">
                    <FaFileExport />
                  </div>
                  <p>Exporte relatórios ao final da reunião</p>
                </li>
                <li>
                  <div className="check-icon">
                    <FaBan />
                  </div>
                  <p>Sem papel ou confusão</p>
                </li>
                <li>
                  <div className="check-icon">
                    <FaChartLine />
                  </div>
                  <p>Relatórios automáticos ao final</p>
                </li>
                <li>
                  <div className="check-icon">
                    <FaQrcode />
                  </div>
                  <p>Acesso por QR Code, link ou código</p>
                </li>
                <li>
                  <div className="check-icon">
                    <FaMobileAlt />
                  </div>
                  <p>Funciona em celular e computador</p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer com cores do RS e informações do sistema - Versão atualizada */}
      <footer className="landing-footer" id="contato-section">
        <div className="footer-top">
          <div className="footer-column">
            <img src={votcheLogo} alt="Votchê" className="footer-logo-img" />
            <p>
              Sistema de votação online para reuniões, assembleias e eventos.
              Facilitando decisões coletivas com segurança e transparência.
            </p>
          </div>
          <div className="footer-column">
            <ul className="footer-nav-list">
              <li>
                <a href="#sobre">Sobre</a>
              </li>
              <li>
                <a href="#como-funciona">Como funciona</a>
              </li>
              <li>
                <a href="#contato">Contato</a>
              </li>
              <li>
                <a href="#politica">Política de Privacidade</a>
              </li>
              <li>
                <a href="#termos">Termos de Uso</a>
              </li>
            </ul>
          </div>
          <div className="footer-column">
            <h4>Contato</h4>
            <p>votche@gmail.com</p>
            <p>(55) 55996370515</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>
            © {new Date().getFullYear()} Votchê. Todos os direitos reservados.
          </p>
          <button
            className="back-to-top"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <FaArrowUp /> Voltar ao topo
          </button>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
