
import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'FR' | 'EN' | 'SP';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  locale: string; // for date formatting
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  FR: {
    // Navigation
    nav_home: "Accueil",
    nav_sports: "Sports",
    nav_create: "Créer",
    nav_gallery: "Galerie",
    nav_profile: "Profil",
    
    // Home Banners
    banner_l1_title: "Ligue 1",
    banner_l1_desc: "La rentrée du football\nfrançais c'est maintenant !",
    banner_pl_title: "Premier League",
    banner_pl_desc: "La plus grande ligue du monde s'affiche aussi chez vous !",
    banner_c1_title: "Champions League",
    banner_c1_desc: "Les soirées européennes méritent des visuels à la hauteur.",
    banner_c3_title: "Europa League",
    banner_c3_desc: "Ne ratez plus une affiche de vos matchs du jeudi soir !",
    btn_create: "Créer vos visuels",
    
    // Disciplines
    sport_football: "Football",
    sport_basketball: "Basket",
    sport_fighting: "Combat",
    sport_tennis: "Tennis",
    sport_available_desc: "La saison reprend maintenant !",
    sport_soon_desc: "Les plus grands matchs arrivent bientôt sur All Sports !",
    btn_coming_soon: "Bientôt...",

    // Competitions
    country_france: "France",
    country_england: "Angleterre",
    country_spain: "Espagne",
    country_italy: "Italie",
    country_germany: "Allemagne",
    country_portugal: "Portugal",
    country_netherlands: "Pays-Bas",
    country_belgium: "Belgique",
    region_big_competitions: "Grandes Compétitions",

    // Profile
    profile_title: "PROFIL",
    profile_badges_title: "Mes badges",
    profile_badges_desc: "Débloquez des badges en créant des visuels !",
    profile_stats_title: "Statistiques",
    stats_visuals: "Visuels générés",
    stats_fav_league: "Ligue favorite",
    stats_fav_sport: "Sport favori",
    stats_member_since: "Membre depuis",
    
    profile_label_name: "Nom & Prénom",
    profile_label_company: "Nom de l'entreprise",
    profile_label_address: "Adresse de l'entreprise",
    profile_label_email: "Email",
    profile_label_password: "Mot de passe",
    profile_label_sub: "Abonnement",
    profile_manage_sub: "Gérer mon abonnement",
    profile_sub_pro: "PRO",
    profile_btn_edit: "Modifier",
    profile_btn_save: "Enregistrer",
    profile_change_photo: "Modifier le logo",
    profile_logout: "Se déconnecter",

    // Auth & Onboarding
    auth_login_title: "Se connecter",
    auth_signup_title: "Créer un compte",
    auth_btn_login: "Se connecter",
    auth_btn_signup: "S'inscrire",
    auth_no_account: "Je n'ai pas de compte.",
    auth_has_account: "J'ai déjà un compte.",
    auth_link_signup: "Je m'inscris",
    auth_link_login: "Je me connecte",
    
    onboarding_title: "Configuration",
    onboarding_subtitle: "Complétez votre profil pour personnaliser vos visuels.",
    onboarding_btn_finish: "Terminer",
    onboarding_upload_logo: "Ajouter votre logo",

    // General
    loading: "Chargement...",
    save: "Enregistrer",
    next: "Suivant",
    processing: "Traitement",
    gallery_empty: "Aucun poster enregistré.",
  },
  EN: {
    nav_home: "Home",
    nav_sports: "Sports",
    nav_create: "Create",
    nav_gallery: "Gallery",
    nav_profile: "Profile",

    banner_l1_title: "Ligue 1",
    banner_l1_desc: "French football is back,\nstart creating now!",
    banner_pl_title: "Premier League",
    banner_pl_desc: "The world's biggest league is now available for you!",
    banner_c1_title: "Champions League",
    banner_c1_desc: "European nights deserve top-tier visuals.",
    banner_c3_title: "Europa League",
    banner_c3_desc: "European nights deserve top-tier visuals.",
    btn_create: "Create your visuals",

    sport_football: "Football",
    sport_basketball: "Basketball",
    sport_fighting: "Fighting",
    sport_tennis: "Tennis",
    sport_available_desc: "The season starts now!",
    sport_soon_desc: "The biggest matches are coming soon to All Sports!",
    btn_coming_soon: "Coming soon...",

    country_france: "France",
    country_england: "England",
    country_spain: "Spain",
    country_italy: "Italy",
    country_germany: "Germany",
    country_portugal: "Portugal",
    country_netherlands: "Netherlands",
    country_belgium: "Belgium",
    region_big_competitions: "Big Competitions",

    profile_title: "PROFILE",
    profile_badges_title: "My Badges",
    profile_badges_desc: "Unlock badges by creating visuals!",
    profile_stats_title: "Statistics",
    stats_visuals: "Visuals Generated",
    stats_fav_league: "Favorite League",
    stats_fav_sport: "Favorite Sport",
    stats_member_since: "Member Since",

    profile_label_name: "Full Name",
    profile_label_company: "Company Name",
    profile_label_address: "Company Address",
    profile_label_email: "Email",
    profile_label_password: "Password",
    profile_label_sub: "Subscription",
    profile_manage_sub: "Manage Subscription",
    profile_sub_pro: "PRO",
    profile_btn_edit: "Edit",
    profile_btn_save: "Save",
    profile_change_photo: "Change logo",
    profile_logout: "Log out",

    auth_login_title: "Log in",
    auth_signup_title: "Create Account",
    auth_btn_login: "Log in",
    auth_btn_signup: "Sign up",
    auth_no_account: "Don't have an account?",
    auth_has_account: "Already have an account?",
    auth_link_signup: "Sign up",
    auth_link_login: "Log in",

    onboarding_title: "Setup Profile",
    onboarding_subtitle: "Complete your profile to customize your visuals.",
    onboarding_btn_finish: "Finish",
    onboarding_upload_logo: "Upload Logo",

    loading: "Loading...",
    save: "Save",
    next: "Next",
    processing: "Processing",
    gallery_empty: "No saved posters yet.",
  },
  SP: {
    nav_home: "Inicio",
    nav_sports: "Deportes",
    nav_create: "Crear",
    nav_gallery: "Galería",
    nav_profile: "Perfil",

    banner_l1_title: "Ligue 1",
    banner_l1_desc: "¡El fútbol francés ha vuelto,\ncrea tus visuales ahora!",
    banner_pl_title: "Premier League",
    banner_pl_desc: "¡La liga más grande del mundo ya está disponible para ti!",
    banner_c1_title: "Champions League",
    banner_c1_desc: "Las noches europeas merecen visuales de alto nivel.",
    banner_c3_title: "Europa League",
    banner_c3_desc: "Las noches europeas merecen visuales de alto nivel.",
    btn_create: "Crea tus visuales",

    sport_football: "Fútbol",
    sport_basketball: "Baloncesto",
    sport_fighting: "Lucha",
    sport_tennis: "Tenis",
    sport_available_desc: "¡La temporada comienza ahora!",
    sport_soon_desc: "¡Los partidos más grandes llegarán pronto a All Sports!",
    btn_coming_soon: "Próximamente...",

    country_france: "Francia",
    country_england: "Inglaterra",
    country_spain: "España",
    country_italy: "Italia",
    country_germany: "Alemania",
    country_portugal: "Portugal",
    country_netherlands: "Países Bajos",
    country_belgium: "Bélgica",
    region_big_competitions: "Grandes Competiciones",

    profile_title: "PERFIL",
    profile_badges_title: "Mis Insignias",
    profile_badges_desc: "¡Desbloquea insignias creando visuales!",
    profile_stats_title: "Estadísticas",
    stats_visuals: "Visuales Generados",
    stats_fav_league: "Liga Favorita",
    stats_fav_sport: "Deporte Favorito",
    stats_member_since: "Miembro desde",

    profile_label_name: "Nombre Completo",
    profile_label_company: "Nombre de la empresa",
    profile_label_address: "Dirección de la empresa",
    profile_label_email: "Correo electrónico",
    profile_label_password: "Contraseña",
    profile_label_sub: "Suscripción",
    profile_manage_sub: "Gestionar suscripción",
    profile_sub_pro: "PRO",
    profile_btn_edit: "Editar",
    profile_btn_save: "Guardar",
    profile_change_photo: "Cambiar logo",
    profile_logout: "Cerrar sesión",

    auth_login_title: "Iniciar sesión",
    auth_signup_title: "Crear cuenta",
    auth_btn_login: "Iniciar sesión",
    auth_btn_signup: "Registrarse",
    auth_no_account: "¿No tienes una cuenta?",
    auth_has_account: "¿Ya tienes una cuenta?",
    auth_link_signup: "Registrarse",
    auth_link_login: "Iniciar sesión",

    onboarding_title: "Configuración",
    onboarding_subtitle: "Completa tu perfil para personalizar tus visuales.",
    onboarding_btn_finish: "Terminar",
    onboarding_upload_logo: "Subir logo",

    loading: "Cargando...",
    save: "Guardar",
    next: "Siguiente",
    processing: "Procesando",
    gallery_empty: "Aún no hay pósters guardados.",
  }
};

const locales: Record<Language, string> = {
  FR: 'fr-FR',
  EN: 'en-US',
  SP: 'es-ES'
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('FR');

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, locale: locales[language] }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
