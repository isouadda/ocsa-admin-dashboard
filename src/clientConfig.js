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
    gold: '#C8A84E',
  },
  employee: {
    idPrefix: 'OCSA',
  },
};

export default clientConfig;
