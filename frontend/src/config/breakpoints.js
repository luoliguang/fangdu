export const BREAKPOINTS = Object.freeze({
  desktop: 1024,
  tablet: 768,
  mobile: 480,
  mobileSmall: 420
});

export const MEDIA_QUERY = Object.freeze({
  desktopDown: `(max-width: ${BREAKPOINTS.desktop}px)`,
  tabletDown: `(max-width: ${BREAKPOINTS.tablet}px)`,
  mobileDown: `(max-width: ${BREAKPOINTS.mobile}px)`,
  mobileSmallDown: `(max-width: ${BREAKPOINTS.mobileSmall}px)`
});
