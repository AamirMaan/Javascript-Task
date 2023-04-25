import { v4 } from 'uuid';
import axios from 'axios';
import Router from 'next/router';
import { action, computed, configure, flow, observable } from 'mobx';
import { useStaticRendering } from 'mobx-react';
import moment from 'moment';
import Cookies from 'js-cookie';
import isTesterIdWhiteListed from 'helpers/is-testerId-white-listed/isTesterIdWhiteListed';
import mandatoryFields from '../../constants/mandatoryFields';
import {
    BACS,
    BANK_GIRO,
    BLUE_CASH,
    CHAPS,
    ELIXIR,
    EU_DOMESTIC_NON_EURO,
    EXPRESS_ELIXIR,
    FASTER_PAYMENTS,
    PLUS_GIRO,
    SEPA,
    SEPA_INSTANT,
    SORBNET,
    TABS,
} from '../../constants/playground';
import ModalStore from '../common/modals/ModalStore';
import SupportTicketModalStore from '../common/modals/support-ticket/SupportTicketModalStore';
import TabVrpSetup from './vrp/tabs/vrp-setup/TabVrpSetup';
import TabVrpInitiation from './vrp/tabs/vrp-initiation/TabVrpInitiation';
import VrpStore from './vrp/VrpStore';

import sortByKey from 'helpers/sort-by-key/sort-by-key';
import { ALLOW } from 'constants/restrictions';
const { publicRuntimeConfig } = require('next/config').default();

const isServer = typeof window === 'undefined';

useStaticRendering(isServer);
configure({
    enforceActions: 'observed',
});

class PlaygroundStore {
    SupportTicketModalStore = new SupportTicketModalStore(this);
    GenericSuccessStore = new ModalStore();
    GenericErrorStore = new ModalStore();
    VrpStore = new VrpStore(this);
    error = '';

    @observable
    isCrowdSource = false;

    @observable
    date = moment(Date.now()).format('MMDDYYYY');

    paymentMethods = {
        EUR: [SEPA, SEPA_INSTANT],
        PLN: [ELIXIR, EXPRESS_ELIXIR, SORBNET, BLUE_CASH],
        GBP: [FASTER_PAYMENTS, CHAPS, BACS],
        HUF: [EU_DOMESTIC_NON_EURO],
        NOK: [EU_DOMESTIC_NON_EURO],
        BGN: [EU_DOMESTIC_NON_EURO],
        DKK: [EU_DOMESTIC_NON_EURO],
        CZK: [EU_DOMESTIC_NON_EURO],
        SEK: [EU_DOMESTIC_NON_EURO, BANK_GIRO, PLUS_GIRO],
        RON: [EU_DOMESTIC_NON_EURO],
    };

    @observable
    banks = [];

    @observable
    selectedBank = null;

    @observable
    form = {
        requestType: 'accountServices',
        accounts: true,
        description: '',
        balance: true,
        transactions: true,
        refId: '',
        amount: '1',
        currency: publicRuntimeConfig.playground.currencies[0],
        testerId: '',
        transferDestination: '',
        beneficiaryIban: '',
        beneficiaryBic: '',
        accountNumber: '',
        bankgiroNumber: '',
        plusgiroNumber: '',
        sortCode: '',
        bankId: '',
        country: '',
        metadata: {
            creditorAgentBicFi: '',
            creditorAgentName: '',
            deliveryMode: '',
        },
        openBankingStandard: '',
        creditorLegalName: '',
        debtorLegalName: '',
        debtorIban: '',
        debtorBic: '',
        memberType: '',
        tppCallback: false,
        webAppEnabled: true,
        returnRefundAccount: false,
        credentialFields: {},
        bban: '',
        clearingNumber: '',
        devKey: '',
        // Mandatory Fields
        addressCity: '',
        addressCountry: '',
        addressPostCode: '',
        addressHouseNumber: '',
        addressStreet: '',
        customizationId: '',
        accessIban: '',
        accessCurrency: '',
        disableFutureDatedPaymentConversion: true,
        useCredentialFlow: true,
        useWebappCredentialsFlow: false,
    };
    @observable
    redirectUrl = '';
    @observable
    loading = false;
    @observable
    authTypes = ['accountServices', 'singlePayment'];
    @observable
    env = null;
    typeMap = {
        accounts: 'ACCOUNTS',
        balance: 'BALANCES',
        transactions: 'TRANSACTIONS',
    };
    dataParams = Object.keys(this.typeMap).filter((t) => t !== 'accounts');
    amounts = ['1', '5', '10', '50'];
    @observable
    supportTicketLink = '';
    @observable
    isIbanValid = false;
    @observable
    isIbanLoading = false;
    @observable
    countries = [];
    @observable
    banksBaseUrl = '';
    @observable
    vrp = 'variableRecurringPayment';
    @observable
    vrpTabs = {
        vrpSetup: TabVrpSetup,
        vrpInit: TabVrpInitiation,
    };
    @observable
    vrpTabValue = Object.keys(this.vrpTabs)[0];
    @observable
    vrpEnabledTesterId = ['type2tppcallback', 'type2tppcallbackwebapp'];

    @observable
    v2flagOn = publicRuntimeConfig?.v2TestToolTab === ALLOW;

    @action
    handleVrpTabChange = (event, newTab) => {
        this.vrpTabValue = newTab;
    };

    @action
    handlePlaygroundTabChange = async (event) => {
        const tabValue = event.target?.innerText;
        Cookies.set('PlaygroundTabValue', tabValue);
        if (tabValue === TABS.V2) {
            await Router.push(Router.pathname + '/v2');
        } else {
            await Router.push(Router.pathname.replace(/\/v2/, ''));
        }
    };

    @action
    setSupportTicketLink = (link) => {
        this.supportTicketLink = link;
    };
    @action
    enableCrowdSource = () => {
        this.isCrowdSource = true;
    };
    openSupportTicketModal = () => {
        this.SupportTicketModalStore.setForm(
            {
                refId: localStorage.getItem('refId'),
                bankId: localStorage.getItem('bankId'),
                description: localStorage.getItem('description'),
            },
            this.error,
        );
        this.SupportTicketModalStore.openModal();
        this.generateValues();
    };
    @action
    changeForm = (name, value) => {
        this.form[name] = value;
        if (name === 'disableFutureDatedPaymentConversion') {
            this.form.disableFutureDatedPaymentConversion = !value;
        }
        if (name === 'testerId' || name === 'requestType' || name === 'bankId') {
            this.configureTesterID();
        }
        if (
            name === 'beneficiaryIban' ||
            name === 'beneficiaryBic' ||
            name === 'debtorIban' ||
            name === 'debtorBic'
        ) {
            this.form[name] = value.toUpperCase();
        }
        if (name === 'currency') {
            if (value === 'PLN') {
                this.handleCountryChange({ target: { value: 'PL' } });
            }
            if (value === 'GBP') {
                this.handleCountryChange({ target: { value: 'GB' } });
            }
            if (value === 'HUF') {
                this.handleCountryChange({ target: { value: 'HU' } });
            }
            if (value === 'NOK') {
                this.handleCountryChange({ target: { value: 'NO' } });
            }
            if (value === 'BGN') {
                this.handleCountryChange({ target: { value: 'BG' } });
            }
            if (value === 'DKK') {
                this.handleCountryChange({ target: { value: 'DK' } });
            }
            if (value === 'CZK') {
                this.handleCountryChange({ target: { value: 'CZ' } });
            }
            if (value === 'SEK') {
                this.handleCountryChange({ target: { value: 'SE' } });
            }
            if (value === 'RON') {
                this.handleCountryChange({ target: { value: 'RO' } });
            }
            this.form.transferDestination = '';
        }
    };
    @computed
    get description() {
        return 'DESC' + Math.random().toString(36).substring(2, 10).toUpperCase();
    }
    handleClick = (event) => {
        this.changeForm(event.target.name, event.target.value);
        if (event.target.value === 'accountServices') {
            Object.keys(this.typeMap).forEach((key) => {
                this.changeForm(key, true);
            });
        }
    };
    handleChange = (event) => {
        this.changeForm(event.target.name, event.target.value);
    };
    handleMetadataChange = (event) => {
        this.changeMetadata(event.target.name, event.target.value);
    };
    @action
    handleCredentialFieldsChange = (event) => {
        this.form.credentialFields[event.target.name] = event.target.value;
    };
    @action
    changeMetadata = (name, value) => {
        this.form.metadata[name] = value;
    };
    @action
    handleCountryChange = flow(
        function* (event) {
            this.changeForm('country', event.target.value);
            this.changeForm('bankId', '');
            this.selectedBank = null;
            this.banks = [];
            const banksBaseUrl = this.banksBaseUrl;
            const devKey = this.form.devKey ? this.form.devKey : 'global-test';
            const res = yield axios.get(`${banksBaseUrl}&country=${this.form.country}`, {
                headers: { 'token-dev-key': devKey },
            });
            this.banks = res.data.banks || [];
        }.bind(this),
    );
    @action
    getHeaders() {
        return {
            jsonError: true,
            deviceId: v4(),
            userAgent: navigator.userAgent,
        };
    }
    @action
    getFilteredBanks = flow(
        function* (event) {
            if (event?.target.name === 'bankName' && event?.target.value !== '') {
                const constructUrl = new URLSearchParams();
                constructUrl.append('country', this.form.country);
                constructUrl.append('search', event.target.value);
                const url = constructUrl.toString().replace(/[+]+/g, '%20');
                const banksBaseUrl = this.banksBaseUrl;
                const devKey = this.form.devKey ? this.form.devKey : 'global-test';
                const res = yield axios.get(`${banksBaseUrl}&${url}`, {
                    headers: { 'token-dev-key': devKey },
                });
                this.banks = res.data.banks || [];
            }
        }.bind(this),
    );
    @action
    handleAutocomplete = (event, value) => {
        event.preventDefault();
        if (!value) {
            this.form.bankId = '';
            this.selectedBank = null;
            this.form.credentialFields = {};
        } else {
            this.form.bankId = value.id;
            localStorage.setItem('bankId', value.id);
            this.selectedBank = value;
            this.form.openBankingStandard = value.openBankingStandard;
            this.form.credentialFields = {};
            if (value.credentialFields) {
                value.credentialFields.forEach((key) => {
                    this.form.credentialFields[key.id] = '';
                });
            }
        }
    };
    handleCheck = (event) => {
        this.changeForm(event.target.name, event.target.checked);
        this.changeForm(
            'accounts',
            this.dataParams.some((p) => !!this.form[p]),
        );
    };
    @action
    generateValues = () => {
        this.form.refId = `RefTest${Math.random().toString(36).substring(2, 11)}`.toUpperCase();
        this.form.description = this.description;
    };
    @computed
    get isFormFilled() {
        const {
            requestType,
            beneficiaryIban,
            accountNumber,
            sortCode,
            currency,
            transferDestination,
            bankId,
            bankgiroNumber,
            plusgiroNumber,
            creditorLegalName,
            debtorLegalName,
            debtorIban,
            debtorBic,
            credentialFields,
            addressCity,
            addressCountry,
            addressPostCode,
            addressHouseNumber,
            addressStreet,
        } = this.form;
        if (requestType === 'accountServices') {
            if (!this.dataParams.some((p) => !!this.form[p])) {
                return false;
            }
        } else {
            if (!transferDestination) {
                return false;
            }
            if (currency === 'GBP' && (!accountNumber || !sortCode)) {
                return false;
            }
            if (
                ['EUR', 'HUF', 'NOK', 'BGN', 'DKK', 'CZK', 'RON'].includes(currency) &&
                !beneficiaryIban
            ) {
                return false;
            }
            if (currency === 'PLN' && !accountNumber) {
                return false;
            }

            const fields = this.selectedBank?.mandatoryFields?.transfer?.domestic?.fields || [];

            if (
                (transferDestination === BANK_GIRO && !bankgiroNumber) ||
                (transferDestination === PLUS_GIRO && !plusgiroNumber) ||
                (transferDestination === EU_DOMESTIC_NON_EURO &&
                    !beneficiaryIban &&
                    !fields.includes(mandatoryFields.bban))
            ) {
                return false;
            }
            // mandatory fields are not displayed when webAppEnabled is true, so these are not required
            if (this.selectedBank?.mandatoryFields && !this.form.webAppEnabled) {
                const { domestic } = this.selectedBank.mandatoryFields.transfer;
                const { fields, stetFields, polishapiFields } = domestic;
                const { creditorAgentBicFi, creditorAgentName, deliveryMode } = this.form.metadata;
                if (
                    (fields?.includes(mandatoryFields.debtorAccount) && !debtorIban) ||
                    (fields?.includes(mandatoryFields.debtorName) && !debtorLegalName) ||
                    (fields?.includes(mandatoryFields.debtorBic) && !debtorBic) ||
                    (fields?.includes(mandatoryFields.creditorName) && !creditorLegalName) ||
                    (fields?.includes(mandatoryFields.addressStreet) && !addressStreet) ||
                    (fields?.includes(mandatoryFields.addressHouseNumber) && !addressHouseNumber) ||
                    (fields?.includes(mandatoryFields.addressPostCode) && !addressPostCode) ||
                    (fields?.includes(mandatoryFields.addressCity) && !addressCity) ||
                    (fields?.includes(mandatoryFields.addressCountry) && !addressCountry) ||
                    (stetFields?.includes(mandatoryFields.stet.creditorAgent) &&
                        (!creditorAgentName || !creditorAgentBicFi)) ||
                    (polishapiFields?.includes(mandatoryFields.polishApi.deliveryMode) &&
                        !deliveryMode)
                ) {
                    return false;
                }
            }
        }
        // credential fields are not displayed when webAppEnabled is true, so these are not required
        if (
            this.selectedBank?.credentialFields &&
            !this.form.webAppEnabled &&
            !this.form.useWebappCredentialsFlow
        ) {
            return !Object.values(credentialFields).includes('');
        }
        if (this.form.beneficiaryIban && !this.isIbanValid) {
            return false;
        }

        return !(!this.form.testerId || !isTesterIdWhiteListed(this.form.testerId)) && !!bankId;
    }
    @action
    configureTesterID = () => {
        if (isTesterIdWhiteListed(this.form.testerId)) {
            this.form.memberType = this.form.testerId.toLowerCase().includes('type2')
                ? 'type2'
                : 'type1';
            if (this.form.memberType === 'type2') {
                this.form.webAppEnabled = this.form.testerId.toLowerCase().includes('webapp');
                this.form.tppCallback = this.form.testerId.toLowerCase().includes('tpp');
            } else {
                this.form.webAppEnabled = true;
            }
            localStorage.setItem('testerId', this.form.testerId);
            localStorage.setItem('memberType', this.form.memberType);
            localStorage.setItem('webAppEnabled', this.form.webAppEnabled);
            localStorage.setItem('tppCallback', this.form.tppCallback);
            this.VrpStore.setIsWebApp(
                localStorage.getItem('testerId').toLowerCase() === 'type2tppcallbackwebapp',
            );
        }
    };
    @action
    getTppMemberId = async () => {
        try {
            const url = new URLSearchParams();
            url.append('testerId', localStorage.getItem('testerId'));
            url.append('memberType', localStorage.getItem('memberType'));
            url.append('tppCallback', localStorage.getItem('tppCallback'));
            const response = await axios.get(`/testerId-info?${url}`);
            const memberId = response.data.memberId;
            const countryCodeList = response.data.countryCodeList;
            this.VrpStore.setMemberId(memberId);
            await this.getBanksBaseUrl(memberId);
            await this.formatCountryList(countryCodeList);
        } catch (e) {
            console.error(e);
        }
    };
    @action
    getBanksBaseUrl = async (memberId) => {
        // All providers except Afterbanks and finAPI
        const getBanksUrlParams = new URLSearchParams();
        getBanksUrlParams.append('providers', 'Token');
        getBanksUrlParams.append('providers', 'mBank');
        getBanksUrlParams.append('providers', 'Citi');
        getBanksUrlParams.append('providers', 'Amex');
        getBanksUrlParams.append('providers', 'Starling');
        getBanksUrlParams.append('providers', 'CMA9');
        getBanksUrlParams.append('providers', 'Polish API');
        getBanksUrlParams.append('providers', 'STET');
        getBanksUrlParams.append('providers', 'NextGenPSD2');
        getBanksUrlParams.append('providers', 'Sparkasse');
        getBanksUrlParams.append('providers', 'Czech Open Banking Standard');
        getBanksUrlParams.append('providers', 'Slovak Banking API Standard');
        getBanksUrlParams.append('providers', 'Budapest Bank');
        getBanksUrlParams.append('providers', 'Mock');
        getBanksUrlParams.append('memberId', memberId);
        const url = getBanksUrlParams.toString().replace(/[+]+/g, '%20');
        const banksBaseUrl = `${publicRuntimeConfig.apiUrl}/banks?${url}`;
        this.banksBaseUrl = banksBaseUrl;
    };
    @action
    formatCountryList = async (countryCodeList) => {
        this.countries = [];
        const countriesList = [];
        countryCodeList.map((b) =>
            publicRuntimeConfig.playground.countries.map((country) =>
                country.code === b
                    ? countriesList.push({ code: country.code, name: country.name })
                    : '',
            ),
        );
        sortByKey(countriesList, 'name');
        this.updateCountries(countriesList);
    };
    @action
    updateCountries = (countriesList) => {
        countriesList.map((b) => this.countries.push(b));
    };
    @computed
    get pagePath() {
        return this.isCrowdSource ? '/test-tool' : '/playground';
    }

    getTokenRequestUrl = flow(
        function* () {
            try {
                localStorage.setItem('testerId', this.form.testerId);
                const res = yield axios.post(`${this.pagePath}/request-token`, {
                    form: this.form,
                    mandatoryFields:
                        this.form.requestType === 'singlePayment'
                            ? this.selectedBank?.mandatoryFields?.transfer.domestic
                            : this.selectedBank?.mandatoryFields?.access,
                    headers: this.getHeaders(),
                });
                return res.data;
            } catch (e) {
                this.error = e.message;
                console.error(e);
            }
        }.bind(this),
    );

    @action
    validateIban = flow(
        function* (iban, t) {
            this.isIbanLoading = true;
            this.isIbanValid = false;
            try {
                yield axios.put('/api/playground/validate-iban', { iban });
                this.isIbanValid = true;
            } catch (e) {
                this.isIbanValid = false;
            }
            this.isIbanLoading = false;
            if (!this.isIbanValid) {
                return t('common:invalidIban');
            }
            return '';
        }.bind(this),
    );

    @action
    getTokenEnv = flow(
        function* () {
            const res = yield axios.get('/playground/token-env');
            this.env = res.data;
            this.VrpStore.setEnv(this.env);
        }.bind(this),
    );
}

export default PlaygroundStore;
