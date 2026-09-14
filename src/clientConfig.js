const COMPANY_NAME = 'OCSA Cleaning Inc.';
const COMPANY_LOCATION = 'Philadelphia, PA';
const CONFIDENTIAL_LABEL = 'Confidential Record';

const clientConfig = {
  company: {
    name: COMPANY_NAME,
    shortName: 'OCSA Cleaning',
    brandTag: 'OCSA',
    location: COMPANY_LOCATION,
    confidentialLabel: CONFIDENTIAL_LABEL,
    footerLine: `${COMPANY_NAME} | ${COMPANY_LOCATION} | ${CONFIDENTIAL_LABEL}`,
  },
  brand: {
    navy: '#0A1628',
    gold: '#E7B017',
    navyDark: '#0F1D32',
    blueDeep: '#0D2C93',
    panelLight: '#15558F',
  },
  employee: {
    idPrefix: 'OCSA',
  },
};

export default clientConfig;
