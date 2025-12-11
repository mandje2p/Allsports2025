
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
    profile_btn_see_all_badges: "Voir tous les badges",
    badges_page_title: "Tous les Badges",
    
    profile_stats_title: "Statistiques",
    stats_visuals: "Visuels générés",
    stats_fav_league: "Ligue favorite",
    stats_fav_club: "Club préféré",
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
    auth_apple_login: "Se connecter avec Apple",
    auth_google_login: "Se connecter avec Google",
    auth_apple_signup: "S'inscrire avec Apple",
    auth_google_signup: "S'inscrire avec Google",
    
    onboarding_title: "Configuration",
    onboarding_subtitle: "Complétez votre profil pour personnaliser vos visuels.",
    onboarding_btn_finish: "Terminar",
    onboarding_upload_logo: "Ajouter votre logo",

    // Subscription
    sub_title: "Choisir un forfait",
    sub_btn_subscribe: "Souscrire",
    sub_btn_subscribe_trial: "Souscrire (Testez 14 jours)",
    sub_btn_later: "Je le ferai plus tard",
    
    plan_free_name: "Free",
    plan_free_period: "/mois",
    plan_basic_name: "Basic",
    plan_basic_sub: "sans engagement",
    plan_basic_period: "/mois",
    plan_pro_name: "Pro",
    plan_pro_sub: "-15% par rapport au forfait Basic",
    plan_pro_period: "/mois",
    plan_premium_name: "Premium",
    plan_premium_sub: "-30% par rapport au Basic",
    plan_premium_period: "/an",

    feat_3_visuals: "3 visuels par mois",
    feat_unlimited_visuals: "Visuels illimités par mois",
    feat_25_bg: "25 fonds d'écrans",
    feat_100_bg: "100 fonds d'écrans",
    feat_early_access: "Accès anticipé des compétitions",
    feat_support: "Service client express",
    feat_support_std: "Service client standard",

    // Background Selection
    cat_my_gallery: "Ma Galerie",
    gallery_bg_empty: "Aucun fond sauvegardé",

    // Modals
    modal_format_title: "TYPE D'AFFICHE",
    modal_format_subtitle: "Vous avez sélectionné MATCH_COUNT matchs sur la même date.",
    modal_format_program_title: "Programme du Jour",
    modal_format_program_desc: "Une seule affiche listant tous les matchs.",
    modal_format_classic_title: "Affiches Séparées",
    modal_format_classic_desc: "Créer MATCH_COUNT affiches distinctes.",
    
    modal_delete_title: "Supprimer ?",
    modal_delete_subtitle: "Cette action est définitive.",
    
    // General
    loading: "Chargement...",
    save: "Enregistrer",
    btn_save_bg: "SAUVEGARDER BG",
    next: "Suivant",
    processing: "Traitement",
    gallery_empty: "Aucun poster enregistré.",
    cancel: "Annuler",
    delete: "Supprimer",
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
    profile_btn_see_all_badges: "See all badges",
    badges_page_title: "All Badges",

    profile_stats_title: "Statistics",
    stats_visuals: "Visuals Generated",
    stats_fav_league: "Favorite League",
    stats_fav_club: "Favorite Club",
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
    auth_apple_login: "Log in with Apple",
    auth_google_login: "Log in with Google",
    auth_apple_signup: "Sign up with Apple",
    auth_google_signup: "Sign up with Google",

    onboarding_title: "Setup Profile",
    onboarding_subtitle: "Complete your profile to customize your visuals.",
    onboarding_btn_finish: "Finish",
    onboarding_upload_logo: "Upload Logo",

    sub_title: "Choose a plan",
    sub_btn_subscribe: "Subscribe",
    sub_btn_subscribe_trial: "Subscribe (14 days trial)",
    sub_btn_later: "I'll do it later",

    plan_free_name: "Free",
    plan_free_period: "/mo",
    plan_basic_name: "Basic",
    plan_basic_sub: "no commitment",
    plan_basic_period: "/mo",
    plan_pro_name: "Pro",
    plan_pro_sub: "-15% vs Basic plan",
    plan_pro_period: "/mo",
    plan_premium_name: "Premium",
    plan_premium_sub: "-30% vs Basic",
    plan_premium_period: "/yr",

    feat_3_visuals: "3 visuals per month",
    feat_unlimited_visuals: "Unlimited visuals per month",
    feat_25_bg: "25 backgrounds",
    feat_100_bg: "100 backgrounds",
    feat_early_access: "Early access to competitions",
    feat_support: "Express customer support",
    feat_support_std: "Standard customer support",

    // Background Selection
    cat_my_gallery: "My Gallery",
    gallery_bg_empty: "No saved backgrounds",

    // Modals
    modal_format_title: "POSTER TYPE",
    modal_format_subtitle: "You selected MATCH_COUNT matches on the same date.",
    modal_format_program_title: "Daily Program",
    modal_format_program_desc: "A single poster listing all matches.",
    modal_format_classic_title: "Separate Posters",
    modal_format_classic_desc: "Create MATCH_COUNT distinct posters.",

    modal_delete_title: "Delete?",
    modal_delete_subtitle: "This action is permanent.",

    loading: "Loading...",
    save: "Save",
    btn_save_bg: "SAVE BG",
    next: "Next",
    processing: "Processing",
    gallery_empty: "No saved posters yet.",
    cancel: "Cancel",
    delete: "Delete",
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
    profile_btn_see_all_badges: "Ver todas las insignias",
    badges_page_title: "Todas las Insignias",

    profile_stats_title: "Estadísticas",
    stats_visuals: "Visuales Generados",
    stats_fav_league: "Liga Favorita",
    stats_fav_club: "Club Favorito",
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
    auth_apple_login: "Iniciar sesión con Apple",
    auth_google_login: "Iniciar sesión con Google",
    auth_apple_signup: "Registrarse con Apple",
    auth_google_signup: "Registrarse con Google",

    onboarding_title: "Configuración",
    onboarding_subtitle: "Completa tu perfil para personalizar tus visuales.",
    onboarding_btn_finish: "Terminar",
    onboarding_upload_logo: "Subir logo",

    sub_title: "Elige un plan",
    sub_btn_subscribe: "Suscribirse",
    sub_btn_subscribe_trial: "Suscribirse (Prueba 14 días)",
    sub_btn_later: "Lo haré más tarde",

    plan_free_name: "Free",
    plan_free_period: "/mes",
    plan_basic_name: "Basic",
    plan_basic_sub: "sin compromiso",
    plan_basic_period: "/mes",
    plan_pro_name: "Pro",
    plan_pro_sub: "-15% vs plan Basic",
    plan_pro_period: "/mes",
    plan_premium_name: "Premium",
    plan_premium_sub: "-30% vs Basic",
    plan_premium_period: "/año",

    feat_3_visuals: "3 visuales por mes",
    feat_unlimited_visuals: "Visuales ilimitados por mes",
    feat_25_bg: "25 fondos de pantalla",
    feat_100_bg: "100 fondos de pantalla",
    feat_early_access: "Acceso anticipado a competiciones",
    feat_support: "Servicio al cliente express",
    feat_support_std: "Servicio al cliente estándar",

    // Background Selection
    cat_my_gallery: "Mi Galería",
    gallery_bg_empty: "Sin fondos guardados",

    // Modals
    modal_format_title: "TIPO DE PÓSTER",
    modal_format_subtitle: "Has seleccionado MATCH_COUNT partidos en la misma fecha.",
    modal_format_program_title: "Programa Diario",
    modal_format_program_desc: "Un solo póster con todos los partidos.",
    modal_format_classic_title: "Pósters Separados",
    modal_format_classic_desc: "Crear MATCH_COUNT pósters distintos.",

    modal_delete_title: "¿Eliminar?",
    modal_delete_subtitle: "Esta acción es definitiva.",

    loading: "Cargando...",
    save: "Guardar",
    btn_save_bg: "GUARDAR BG",
    next: "Siguiente",
    processing: "Procesando",
    gallery_empty: "Aún no hay pósters guardados.",
    cancel: "Cancelar",
    delete: "Eliminar",
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
