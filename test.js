import { Tab } from '@material-ui/core';
import { Autocomplete } from '@material-ui/lab';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import _ from 'lodash';
import { Provider } from 'mobx-react';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { getAppStore } from 'src/AppStore';

import BoxSelect from 'components/common/boxSelect/BoxSelect';
import SelectWrapper from 'components/common/wrappers/SelectWrapper';
import PlaygroundV1 from 'components/playground/Playground';
import _PlaygroundStore from 'components/playground/PlaygroundStore';
import _VrpStore from 'components/playground/vrp/VrpStore';

// constants
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
} from 'constants/playground';
import { POLISH_API } from 'constants/bankStandards';
import { EXPRESS_D0 } from 'constants/deliveryModes';
import {
    creditorName,
    debtorAccount,
    debtorName,
    stet,
    polishApi,
    debtorBic,
    iban,
    currency,
} from 'constants/mandatoryFields';
import { ALLOW } from 'constants/restrictions';

jest.unmock('lodash');
_.debounce = jest.fn((fn) => fn);

const { publicRuntimeConfig } = require('next/config').default();

const memberId = 'm:2h9NtRzJbcwZdbFymhPeRhZCwSpe:5zKtXEAq';

const countryCodeList = [
    'DE',
    'BE',
    'PT',
    'LU',
    'FR',
    'HU',
    'AT',
    'SI',
    'CZ',
    'GB',
    'PL',
    'RO',
    'NL',
    'US',
];

const bankList = {
    banks: [
        {
            id: 'finapi-50050222',
            name: '1822direkt - Frankfurter Sparkasse',
            provider: 'finAPI',
            country: 'DE',
            identifier: '50050222',
        },
        {
            id: 'finapi-39060180',
            name: 'Aachener Bank',
            provider: 'finAPI',
            country: 'DE',
            identifier: '39060180',
        },
        {
            id: 'sk-fidu-genoded1aac',
            name: 'Aachener Bank eG',
            provider: 'Sparkasse',
            country: 'DE',
        },
        {
            id: 'sbas-otphu',
            name: 'OTP Banka Hungary',
            provider: 'Slovak Banking API Standard',
            country: 'HU',
            authorizationMetadata: [
                {
                    name: 'IBAN',
                    description: 'IBAN',
                },
            ],
        },
    ],
    paging: {
        page: 1,
        perPage: 10,
        pageCount: 5,
    },
};

jest.retryTimes(3);
describe('Playground', () => {
    let PlaygroundStore, AppStore;
    const axiosMock = new MockAdapter(axios);

    beforeEach(() => {
        localStorage.clear();
        AppStore = getAppStore(true);
        PlaygroundStore = new _PlaygroundStore();
        axiosMock.reset();
        axiosMock.onGet('/playground/token-env').replyOnce(200, 'dev');
        axiosMock.onGet().replyOnce(200, { memberId: memberId, countryCodeList: countryCodeList });
        publicRuntimeConfig.v2TestToolTab = ALLOW;
    });

    it('should render without throwing an error', async () => {
        const wrapper = await asyncMount(
            <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                <PlaygroundV1 />
            </Provider>,
        );

        expect(wrapper.find('.playground')).toHaveLength(1);
        expect(wrapper.find('TokenEnablerButton')).toHaveLength(1);
        expect(PlaygroundStore.selectedBank).toBe(null);
    });

    it('should preselect the testerId from localStorage if exists', async () => {
        jest.spyOn(Object.getPrototypeOf(window.localStorage), 'getItem');
        localStorage.setItem('testerId', 'Token');
        await asyncMount(
            <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                <PlaygroundV1 />
            </Provider>,
        );

        expect(localStorage.getItem).toHaveBeenCalledWith('testerId');
    });

    it('should render Dev Key field as optional', async () => {
        const wrapper = await asyncMount(
            <Provider
                AppStore={AppStore}
                PlaygroundStore={PlaygroundStore}>
                <PlaygroundV1 />
            </Provider>,
        );

        expect(wrapper.find('input[name="devKey"]')).toHaveLength(1);

        wrapper.find('input[name="devKey"]').simulate('change', {
            target: {
                value: 't0k3n!',
                name: 'devKey',
            },
        });
        wrapper.update();
        expect(PlaygroundStore.form.devKey).toBe('t0k3n!');
        expect(PlaygroundStore.isFormFilled).toBeFalsy();
        expect(wrapper.find('TokenEnablerButton').prop('disabled')).toBeTruthy();
    });

    it('should set the customization id if testerId matches the public configuration', async () => {
        axiosMock.onGet().replyOnce(200, { memberId: memberId, countryCodeList: countryCodeList });
        axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, bankList);
        axiosMock.onGet().replyOnce(200, { memberId: memberId, countryCodeList: countryCodeList });
        publicRuntimeConfig.customizationIdsByTesterId = {
            token: { accountServices: 'customizationId' },
        };

        const wrapper = await asyncMount(
            <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                <PlaygroundV1 />
            </Provider>,
        );

        wrapper.find('input[name="testerId"]').simulate('change', {
            target: {
                value: 'Token',
                name: 'testerId',
            },
        });

        wrapper.update();

        expect(PlaygroundStore.form.customizationId).toEqual('customizationId');
    });

    it('should validate the testerId against whitelisted values in config for type 1', async () => {
        const wrapper = await asyncMount(
            <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                <PlaygroundV1 />
            </Provider>,
        );

        axiosMock.onGet().replyOnce(200, { memberId: memberId, countryCodeList: countryCodeList });
        axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, bankList);
        axiosMock.onGet().replyOnce(200, { memberId: memberId, countryCodeList: countryCodeList });
        wrapper.find('input[name="devKey"]').simulate('change', {
            target: {
                value: 't0k3n!',
                name: 'devKey',
            },
        });
        wrapper.update();

        await wrapper.find(SelectWrapper).at(0).prop('onChange')({
            target: {
                name: 'country',
                value: 'DE',
            },
        });

        await wrapper.find(Autocomplete).prop('onChange')(
            {
                preventDefault: Function.prototype,
            },
            {
                id: 'finapi-50050222',
                name: '1822direkt - Frankfurter Sparkasse',
                provider: 'finAPI',
                country: 'DE',
            },
        );

        act(() => {
            wrapper.find(Autocomplete).find('button').at(0).prop('onClick')();
        });

        wrapper.update();

        wrapper.find('input[name="testerId"]').simulate('change', {
            target: {
                value: 'invalid',
                name: 'testerId',
            },
        });
        expect(wrapper.find('TokenEnablerButton').prop('disabled')).toBeTruthy();

        wrapper.find('input[name="testerId"]').simulate('change', {
            target: {
                value: 'Token',
                name: 'testerId',
            },
        });
        expect(PlaygroundStore.form.description).toContain('DESC');
        expect(wrapper.find('TokenEnablerButton').prop('disabled')).toBeFalsy();
    });

    it('should validate the testerId against whitelisted values in config for type 2', async () => {
        const wrapper = await asyncMount(
            <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                <PlaygroundV1 />
            </Provider>,
        );

        publicRuntimeConfig.playground.testerIds.push('type2tppcallback');
        axiosMock.onGet().replyOnce(200, { memberId: memberId, countryCodeList: countryCodeList });
        axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, bankList);
        axiosMock.onGet().replyOnce(200, { memberId: memberId, countryCodeList: countryCodeList });
        wrapper.find('input[name="devKey"]').simulate('change', {
            target: {
                value: 't0k3n!',
                name: 'devKey',
            },
        });
        wrapper.update();

        await wrapper.find(SelectWrapper).at(0).prop('onChange')({
            target: {
                name: 'country',
                value: 'DE',
            },
        });

        await wrapper.find(Autocomplete).prop('onChange')(
            {
                preventDefault: Function.prototype,
            },
            {
                id: 'finapi-50050222',
                name: '1822direkt - Frankfurter Sparkasse',
                provider: 'finAPI',
                country: 'DE',
            },
        );

        act(() => {
            wrapper.find(Autocomplete).find('button').at(0).prop('onClick')();
        });

        wrapper.update();

        wrapper.find('input[name="testerId"]').simulate('change', {
            target: {
                value: 'invalid',
                name: 'testerId',
            },
        });
        expect(wrapper.find('TokenEnablerButton').prop('disabled')).toBeTruthy();

        wrapper.find('input[name="testerId"]').simulate('change', {
            target: {
                value: 'type2tppcallback',
                name: 'testerId',
            },
        });
        wrapper.find('input[name="description"]').simulate('change', {
            target: {
                value: 'DESCRIPTION',
                name: 'description',
            },
        });
        expect(PlaygroundStore.form.description).toEqual('DESCRIPTION');
        expect(wrapper.find('TokenEnablerButton').prop('disabled')).toBeFalsy();
        publicRuntimeConfig.playground.testerIds.pop();
    });

    it("shouldn't allow to test when requirements are not met", async () => {
        const wrapper = await asyncMount(
            <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                <PlaygroundV1 />
            </Provider>,
        );

        await asyncCheck(wrapper, '.checkboxGroup input', 0);
        await asyncCheck(wrapper, '.checkboxGroup input', 1);
        expect(wrapper.find('TokenEnablerButton').prop('disabled')).toBeTruthy();
        expect(PlaygroundStore.isFormFilled).toBeFalsy();
    });
    it('should allow to test when bankId is filled out', async () => {
        const wrapper = await asyncMount(
            <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                <PlaygroundV1 />
            </Provider>,
        );

        axiosMock
            .onGet(/\/testerId-info\?testerId=Token&memberType=type1&tppCallback=false/)
            .replyOnce(200, { memberId: memberId, countryCodeList: countryCodeList });
        axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, bankList);

        wrapper.find('input[name="testerId"]').simulate('change', {
            target: {
                value: 'Token',
                name: 'testerId',
            },
        });

        wrapper.find('input[name="devKey"]').simulate('change', {
            target: {
                value: 't0k3n!',
                name: 'devKey',
            },
        });
        wrapper.update();

        await wrapper.find(SelectWrapper).at(0).prop('onChange')({
            target: {
                name: 'country',
                value: 'DE',
            },
        });

        await wrapper.find(Autocomplete).prop('onChange')(
            {
                preventDefault: Function.prototype,
            },
            {
                id: 'finapi-50050222',
                name: '1822direkt - Frankfurter Sparkasse',
                provider: 'finAPI',
                country: 'DE',
            },
        );

        act(() => {
            wrapper.find(Autocomplete).find('button').at(0).prop('onClick')();
        });

        wrapper.update();
        expect(PlaygroundStore.isFormFilled).toBeTruthy();
        expect(wrapper.find('TokenEnablerButton').prop('disabled')).toBeFalsy();

        await asyncCheck(wrapper, '.checkboxGroup input', 0);
        await asyncCheck(wrapper, '.checkboxGroup input', 1);

        expect(wrapper.find('TokenEnablerButton').prop('disabled')).toBeTruthy();
        expect(PlaygroundStore.isFormFilled).toBeFalsy();
    });

    it('should allow to test when coming back to accounts services', async () => {
        axiosMock.onGet().replyOnce(200, { memberId: memberId, countryCodeList: countryCodeList });
        const wrapper = await asyncMount(
            <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                <PlaygroundV1 />
            </Provider>,
        );

        wrapper.find('input[name="devKey"]').simulate('change', {
            target: {
                value: 't0k3n!',
                name: 'devKey',
            },
        });
        wrapper.update();

        axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, bankList);
        await wrapper.find(SelectWrapper).at(0).prop('onChange')({
            target: {
                name: 'country',
                value: 'DE',
            },
        });

        await wrapper.find(Autocomplete).prop('onChange')(
            {
                preventDefault: Function.prototype,
            },
            {
                id: 'finapi-50050222',
                name: '1822direkt - Frankfurter Sparkasse',
                provider: 'finAPI',
                country: 'DE',
            },
        );

        act(() => {
            wrapper.find(Autocomplete).find('button').at(0).prop('onClick')();
        });

        wrapper.update();

        axiosMock.onGet().replyOnce(200, { memberId: memberId, countryCodeList: countryCodeList });
        wrapper.find('input[name="testerId"]').simulate('change', {
            target: {
                value: 'Token',
                name: 'testerId',
            },
        });

        syncClick(wrapper, BoxSelect, 1);
        expect(PlaygroundStore.isFormFilled).toBeFalsy();
        expect(wrapper.find('TokenEnablerButton').prop('disabled')).toBeTruthy();

        syncClick(wrapper, BoxSelect, 0);
        expect(PlaygroundStore.isFormFilled).toBeTruthy();
        expect(wrapper.find('TokenEnablerButton').prop('disabled')).toBeFalsy();
    });

    it('should log an error for getTokenRequestUrl in PlaygroundStore', async () => {
        console.error.expectError('Request failed with status code 400');
        axiosMock.onPost('/playground/request-token').replyOnce(400, 'Bad Request');
        await PlaygroundStore.getTokenRequestUrl();
    });

    describe('AccountServices', () => {
        beforeEach(() => {
            axiosMock
                .onGet()
                .replyOnce(200, { memberId: memberId, countryCodeList: countryCodeList });
            axiosMock.onPost('/playground/request-token').replyOnce(204);
        });

        it('should render credential fields if selected bank has credential fields', async () => {
            const wrapper = await asyncMount(
                <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                    <PlaygroundV1 />
                </Provider>,
            );

            publicRuntimeConfig.playground.testerIds.push('Type2TokenCallback');
            await wrapper.find('input[name="testerId"]').simulate('change', {
                target: {
                    value: 'Type2TokenCallback',
                    name: 'testerId',
                },
            });

            wrapper.find('input[name="devKey"]').simulate('change', {
                target: {
                    value: 't0k3n!',
                    name: 'devKey',
                },
            });
            wrapper.update();

            axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, bankList);
            await wrapper.find(SelectWrapper).at(0).prop('onChange')({
                target: {
                    name: 'country',
                    value: 'DE',
                },
            });

            await wrapper.find(Autocomplete).prop('onChange')(
                {
                    preventDefault: Function.prototype,
                },
                {
                    id: 'sk-fidu-genoded1aac',
                    name: 'Aachener Bank eG',
                    provider: 'Sparkasse',
                    country: 'DE',
                    credentialFields: [
                        {
                            id: 'IBAN',
                            displayName: 'IBAN',
                        },
                        {
                            id: 'another-field',
                            displayName: 'another-field',
                        },
                    ],
                    mandatoryFields: {
                        access: {
                            fields: [iban, currency],
                        },
                    },
                },
            );
            await wrapper.update();

            await wrapper.find('input[name="IBAN"]').simulate('change', {
                target: {
                    value: 'IBAN',
                    name: 'IBAN',
                },
            });

            await wrapper.find('input[name="another-field"]').simulate('change', {
                target: {
                    value: 'another-field',
                    name: 'another-field',
                },
            });
            expect(wrapper.find('TokenEnablerButton').prop('disabled')).toBeFalsy();
        });
    });

    describe('SinglePayment', () => {
        beforeEach(() => {
            axiosMock
                .onGet()
                .replyOnce(200, { memberId: memberId, countryCodeList: countryCodeList });
            axiosMock.onPost('/playground/request-token').replyOnce(204);
        });

        it('should check for required fields for sepa', async () => {
            const wrapper = await asyncMount(
                <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                    <PlaygroundV1 />
                </Provider>,
            );

            syncClick(wrapper, BoxSelect, 1);

            expect(wrapper.find('TokenEnablerButton').prop('disabled')).toBeTruthy();
            act(() => {
                wrapper.find('input[value="sepa"]').hostNodes().prop('onChange')({
                    target: {
                        name: 'transferDestination',
                        value: SEPA,
                    },
                });
            });
            wrapper.update();

            expect(wrapper.find('input[value="sepa"]').hostNodes().prop('checked')).toBeTruthy();

            wrapper.find('input[name="devKey"]').simulate('change', {
                target: {
                    value: 't0k3n!',
                    name: 'devKey',
                },
            });
            wrapper.update();

            axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, bankList);
            await wrapper.find(SelectWrapper).at(2).prop('onChange')({
                target: {
                    name: 'country',
                    value: 'DE',
                },
            });

            await wrapper.find(Autocomplete).prop('onChange')(
                {
                    preventDefault: Function.prototype,
                },
                {
                    id: 'finapi-50050222',
                    name: '1822direkt - Frankfurter Sparkasse',
                    provider: 'finAPI',
                    country: 'DE',
                    operationalTime: '00:00 to 20:00 CET',
                },
            );

            wrapper.find('input[name="testerId"]').simulate('change', {
                target: {
                    value: 'Token',
                    name: 'testerId',
                },
            });

            axiosMock.onPut(/\/api\/playground\/validate-iban/).reply(200);

            await act(async () => {
                await wrapper.find('input[name="beneficiaryIban"]').simulate('change', {
                    target: {
                        value: '12345678',
                        name: 'beneficiaryIban',
                    },
                });
                await new Promise((r) => setTimeout(r, 1000));
            });
            wrapper.find('input[name="disableFutureDatedPaymentConversion"]').simulate('change', {
                target: {
                    checked: true,
                    name: 'disableFutureDatedPaymentConversion',
                },
            });

            wrapper.update();

            expect(wrapper.find('input[name="beneficiaryBic"]').length).toBe(1);
            expect(wrapper.find('TokenEnablerButton').prop('disabled')).toBeFalsy();
        });

        it('should check for required fields for non euro domestic', async () => {
            const wrapper = await asyncMount(
                <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                    <PlaygroundV1 />
                </Provider>,
            );

            axiosMock
                .onGet(/\/testerId-info\?testerId=Token&memberType=type1&tppCallback=false/)
                .replyOnce(200, { memberId: memberId, countryCodeList: countryCodeList });
            axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, bankList);
            axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, bankList);
            axiosMock.onPut().replyOnce(200);
            axiosMock
                .onGet(/\/testerId-info\?testerId=Token&memberType=type1&tppCallback=false/)
                .replyOnce(200, { memberId: memberId, countryCodeList: countryCodeList });

            syncClick(wrapper, BoxSelect, 1);

            wrapper.find('input[name="testerId"]').simulate('change', {
                target: {
                    value: 'Token',
                    name: 'testerId',
                },
            });

            wrapper.find(SelectWrapper).at(0).prop('onChange')({
                target: {
                    name: 'currency',
                    value: 'HUF',
                },
            });

            wrapper.find('input[name="devKey"]').simulate('change', {
                target: {
                    value: 't0k3n!',
                    name: 'devKey',
                },
            });
            wrapper.update();

            await wrapper.find(SelectWrapper).at(2).prop('onChange')({
                target: {
                    name: 'country',
                    value: 'DE',
                },
            });

            await wrapper.find(Autocomplete).prop('onChange')(
                {
                    preventDefault: Function.prototype,
                },
                {
                    id: 'finapi-50050222',
                    name: '1822direkt - Frankfurter Sparkasse',
                    provider: 'finAPI',
                    country: 'DE',
                },
            );

            expect(wrapper.find('TokenEnablerButton').prop('disabled')).toBeTruthy();
            act(() => {
                wrapper.find('input[value="euDomesticNonEuro"]').hostNodes().prop('onChange')({
                    target: {
                        name: 'transferDestination',
                        value: EU_DOMESTIC_NON_EURO,
                    },
                });
            });
            wrapper.update();

            expect(
                wrapper.find('input[value="euDomesticNonEuro"]').hostNodes().prop('checked'),
            ).toBeTruthy();

            wrapper.find('input[name="testerId"]').simulate('change', {
                target: {
                    value: 'Token',
                    name: 'testerId',
                },
            });

            await act(async () => {
                await wrapper.find('input[name="beneficiaryIban"]').simulate('change', {
                    target: {
                        value: '12345678',
                        name: 'beneficiaryIban',
                    },
                });
                await new Promise((r) => setTimeout(r, 1000));
            });
            wrapper.update();
            expect(wrapper.find('input[name="beneficiaryBic"]').length).toBe(1);
            expect(wrapper.find('TokenEnablerButton').prop('disabled')).toBeFalsy();
        });

        it('should check for required fields for SEPA Instant', async () => {
            const wrapper = await asyncMount(
                <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                    <PlaygroundV1 />
                </Provider>,
            );

            syncClick(wrapper, BoxSelect, 1);

            wrapper.find('input[name="testerId"]').simulate('change', {
                target: {
                    value: 'Token',
                    name: 'testerId',
                },
            });

            act(() => {
                wrapper.find('input[value="sepaInstant"]').hostNodes().prop('onChange')({
                    target: {
                        name: 'transferDestination',
                        value: SEPA_INSTANT,
                    },
                });
            });
            wrapper.find('input[name="devKey"]').simulate('change', {
                target: {
                    value: 't0k3n!',
                    name: 'devKey',
                },
            });
            wrapper.update();

            axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, bankList);
            await wrapper.find(SelectWrapper).at(2).prop('onChange')({
                target: {
                    name: 'country',
                    value: 'DE',
                },
            });

            await wrapper.find(Autocomplete).prop('onChange')(
                {
                    preventDefault: Function.prototype,
                },
                {
                    id: 'finapi-50050222',
                    name: '1822direkt - Frankfurter Sparkasse',
                    provider: 'finAPI',
                    country: 'DE',
                },
            );

            expect(
                wrapper.find('input[value="sepaInstant"]').hostNodes().prop('checked'),
            ).toBeTruthy();
            expect(wrapper.find('input[name="beneficiaryBic"]').length).toBe(1);
            axiosMock.onPut().replyOnce(200);

            await act(async () => {
                await wrapper.find('input[name="beneficiaryIban"]').simulate('change', {
                    target: {
                        value: '12345678',
                        name: 'beneficiaryIban',
                    },
                });
                await new Promise((r) => setTimeout(r, 1000));
            });
            wrapper.update();

            expect(wrapper.find('TokenEnablerButton').prop('disabled')).toBeFalsy();
        });

        it('should check for required fields for elixir', async () => {
            const wrapper = await asyncMount(
                <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                    <PlaygroundV1 />
                </Provider>,
            );

            syncClick(wrapper, BoxSelect, 1);

            wrapper.find('input[name="testerId"]').simulate('change', {
                target: {
                    value: 'Token',
                    name: 'testerId',
                },
            });

            axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, bankList);

            wrapper.find(SelectWrapper).at(0).prop('onChange')({
                target: {
                    name: 'currency',
                    value: 'PLN',
                },
            });
            wrapper.update();

            act(() => {
                wrapper.find('input[value="elixir"]').hostNodes().prop('onChange')({
                    target: {
                        name: 'transferDestination',
                        value: ELIXIR,
                    },
                });
            });
            wrapper.update();
            expect(wrapper.find('input[value="elixir"]').hostNodes().prop('checked')).toBeTruthy();

            wrapper.find('input[name="devKey"]').simulate('change', {
                target: {
                    value: 't0k3n!',
                    name: 'devKey',
                },
            });
            wrapper.update();

            axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, bankList);
            await wrapper.find(SelectWrapper).at(2).prop('onChange')({
                target: {
                    name: 'country',
                    value: 'DE',
                },
            });

            await wrapper.find(Autocomplete).prop('onChange')(
                {
                    preventDefault: Function.prototype,
                },
                {
                    id: 'finapi-50050222',
                    name: '1822direkt - Frankfurter Sparkasse',
                    provider: 'finAPI',
                    country: 'DE',
                },
            );
            expect(wrapper.find('input[name="sortCode"]').length).toBe(0);

            wrapper.find('input[name="accountNumber"]').simulate('change', {
                target: {
                    value: '12345678',
                    name: 'accountNumber',
                },
            });

            expect(wrapper.find('TokenEnablerButton').prop('disabled')).toBeFalsy();
        });

        it('should check for required fields for elixir express', async () => {
            const wrapper = await asyncMount(
                <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                    <PlaygroundV1 />
                </Provider>,
            );

            syncClick(wrapper, BoxSelect, 1);

            wrapper.find('input[name="testerId"]').simulate('change', {
                target: {
                    value: 'Token',
                    name: 'testerId',
                },
            });

            axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, bankList);

            wrapper.find(SelectWrapper).at(0).prop('onChange')({
                target: {
                    name: 'currency',
                    value: 'PLN',
                },
            });
            wrapper.update();

            act(() => {
                wrapper.find('input[value="elixir"]').hostNodes().prop('onChange')({
                    target: {
                        name: 'transferDestination',
                        value: EXPRESS_ELIXIR,
                    },
                });
            });
            wrapper.update();
            expect(
                wrapper.find('input[value="expressElixir"]').hostNodes().prop('checked'),
            ).toBeTruthy();

            wrapper.find('input[name="devKey"]').simulate('change', {
                target: {
                    value: 't0k3n!',
                    name: 'devKey',
                },
            });

            wrapper.update();

            axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, bankList);
            await wrapper.find(SelectWrapper).at(2).prop('onChange')({
                target: {
                    name: 'country',
                    value: 'DE',
                },
            });

            await wrapper.find(Autocomplete).prop('onChange')(
                {
                    preventDefault: Function.prototype,
                },
                {
                    id: 'finapi-50050222',
                    name: '1822direkt - Frankfurter Sparkasse',
                    provider: 'finAPI',
                    country: 'DE',
                },
            );

            expect(wrapper.find('input[name="sortCode"]').length).toBe(0);

            wrapper.find('input[name="accountNumber"]').simulate('change', {
                target: {
                    value: '12345678',
                    name: 'accountNumber',
                },
            });

            expect(wrapper.find('TokenEnablerButton').prop('disabled')).toBeFalsy();
        });

        it('should check for required fields for sorbnet', async () => {
            const wrapper = await asyncMount(
                <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                    <PlaygroundV1 />
                </Provider>,
            );

            syncClick(wrapper, BoxSelect, 1);

            wrapper.find('input[name="testerId"]').simulate('change', {
                target: {
                    value: 'Token',
                    name: 'testerId',
                },
            });

            axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, bankList);

            wrapper.find(SelectWrapper).at(0).prop('onChange')({
                target: {
                    name: 'currency',
                    value: 'PLN',
                },
            });
            wrapper.update();

            act(() => {
                wrapper.find('input[value="sorbnet"]').hostNodes().prop('onChange')({
                    target: {
                        name: 'transferDestination',
                        value: SORBNET,
                    },
                });
            });
            wrapper.update();
            expect(wrapper.find('input[value="sorbnet"]').hostNodes().prop('checked')).toBeTruthy();

            wrapper.find('input[name="devKey"]').simulate('change', {
                target: {
                    value: 't0k3n!',
                    name: 'devKey',
                },
            });

            wrapper.update();

            axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, bankList);
            await wrapper.find(SelectWrapper).at(2).prop('onChange')({
                target: {
                    name: 'country',
                    value: 'DE',
                },
            });

            await wrapper.find(Autocomplete).prop('onChange')(
                {
                    preventDefault: Function.prototype,
                },
                {
                    id: 'finapi-50050222',
                    name: '1822direkt - Frankfurter Sparkasse',
                    provider: 'finAPI',
                    country: 'DE',
                },
            );

            expect(wrapper.find('input[name="sortCode"]').length).toBe(0);

            wrapper.find('input[name="accountNumber"]').simulate('change', {
                target: {
                    value: '12345678',
                    name: 'accountNumber',
                },
            });

            expect(wrapper.find('TokenEnablerButton').prop('disabled')).toBeFalsy();
        });

        it('should check for required fields for blue cash', async () => {
            const wrapper = await asyncMount(
                <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                    <PlaygroundV1 />
                </Provider>,
            );

            syncClick(wrapper, BoxSelect, 1);

            wrapper.find('input[name="testerId"]').simulate('change', {
                target: {
                    value: 'Token',
                    name: 'testerId',
                },
            });

            axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, bankList);

            wrapper.find(SelectWrapper).at(0).prop('onChange')({
                target: {
                    name: 'currency',
                    value: 'PLN',
                },
            });
            wrapper.update();

            act(() => {
                wrapper.find('input[value="blueCash"]').hostNodes().prop('onChange')({
                    target: {
                        name: 'transferDestination',
                        value: BLUE_CASH,
                    },
                });
            });
            wrapper.update();
            expect(
                wrapper.find('input[value="blueCash"]').hostNodes().prop('checked'),
            ).toBeTruthy();

            wrapper.find('input[name="devKey"]').simulate('change', {
                target: {
                    value: 't0k3n!',
                    name: 'devKey',
                },
            });

            wrapper.update();

            axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, bankList);
            await wrapper.find(SelectWrapper).at(2).prop('onChange')({
                target: {
                    name: 'country',
                    value: 'DE',
                },
            });

            await wrapper.find(Autocomplete).prop('onChange')(
                {
                    preventDefault: Function.prototype,
                },
                {
                    id: 'finapi-50050222',
                    name: '1822direkt - Frankfurter Sparkasse',
                    provider: 'finAPI',
                    country: 'DE',
                },
            );

            expect(wrapper.find('input[name="sortCode"]').length).toBe(0);

            wrapper.find('input[name="accountNumber"]').simulate('change', {
                target: {
                    value: '12345678',
                    name: 'accountNumber',
                },
            });

            expect(wrapper.find('TokenEnablerButton').prop('disabled')).toBeFalsy();
        });

        it('should enable button for faster payments', async () => {
            const wrapper = await asyncMount(
                <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                    <PlaygroundV1 />
                </Provider>,
            );

            wrapper.find('input[name="testerId"]').simulate('change', {
                target: {
                    value: 'Token',
                    name: 'testerId',
                },
            });

            syncClick(wrapper, BoxSelect, 1);

            axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, bankList);

            wrapper.find(SelectWrapper).at(0).prop('onChange')({
                target: {
                    name: 'currency',
                    value: 'GBP',
                },
            });
            wrapper.update();

            act(() => {
                wrapper.find('input[value="fasterPayments"]').hostNodes().prop('onChange')({
                    target: {
                        name: 'transferDestination',
                        value: FASTER_PAYMENTS,
                    },
                });
            });
            wrapper.update();
            expect(
                wrapper.find('input[value="fasterPayments"]').hostNodes().prop('checked'),
            ).toBeTruthy();

            wrapper.find('input[name="devKey"]').simulate('change', {
                target: {
                    value: 't0k3n!',
                    name: 'devKey',
                },
            });

            wrapper.update();

            axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, bankList);
            await wrapper.find(SelectWrapper).at(2).prop('onChange')({
                target: {
                    name: 'country',
                    value: 'DE',
                },
            });

            await wrapper.find(Autocomplete).prop('onChange')(
                {
                    preventDefault: Function.prototype,
                },
                {
                    id: 'finapi-50050222',
                    name: '1822direkt - Frankfurter Sparkasse',
                    provider: 'finAPI',
                    country: 'DE',
                },
            );

            expect(wrapper.find('input[name="sortCode"]').length).toBe(1);

            wrapper.find('input[name="accountNumber"]').simulate('change', {
                target: {
                    value: '12345678',
                    name: 'accountNumber',
                },
            });

            expect(wrapper.find('TokenEnablerButton').prop('disabled')).toBeTruthy();

            wrapper.find('input[name="sortCode"]').simulate('change', {
                target: {
                    value: '1234',
                    name: 'sortCode',
                },
            });

            expect(wrapper.find('TokenEnablerButton').prop('disabled')).toBeFalsy();
        });

        it('should check for required fields for chaps', async () => {
            const wrapper = await asyncMount(
                <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                    <PlaygroundV1 />
                </Provider>,
            );

            syncClick(wrapper, BoxSelect, 1);

            wrapper.find('input[name="testerId"]').simulate('change', {
                target: {
                    value: 'Token',
                    name: 'testerId',
                },
            });

            axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, bankList);

            wrapper.find(SelectWrapper).at(0).prop('onChange')({
                target: {
                    name: 'currency',
                    value: 'GBP',
                },
            });
            wrapper.update();

            act(() => {
                wrapper.find('input[value="chaps"]').hostNodes().prop('onChange')({
                    target: {
                        name: 'transferDestination',
                        value: CHAPS,
                    },
                });
            });
            wrapper.update();
            expect(wrapper.find('input[value="chaps"]').hostNodes().prop('checked')).toBeTruthy();

            wrapper.find('input[name="devKey"]').simulate('change', {
                target: {
                    value: 't0k3n!',
                    name: 'devKey',
                },
            });
            wrapper.update();

            axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, bankList);
            await wrapper.find(SelectWrapper).at(2).prop('onChange')({
                target: {
                    name: 'country',
                    value: 'DE',
                },
            });

            await wrapper.find(Autocomplete).prop('onChange')(
                {
                    preventDefault: Function.prototype,
                },
                {
                    id: 'finapi-50050222',
                    name: '1822direkt - Frankfurter Sparkasse',
                    provider: 'finAPI',
                    country: 'DE',
                },
            );
            expect(wrapper.find('input[name="sortCode"]').length).toBe(1);

            wrapper.find('input[name="accountNumber"]').simulate('change', {
                target: {
                    value: '12345678',
                    name: 'accountNumber',
                },
            });

            expect(wrapper.find('TokenEnablerButton').prop('disabled')).toBeTruthy();

            wrapper.find('input[name="sortCode"]').simulate('change', {
                target: {
                    value: '1234',
                    name: 'sortCode',
                },
            });

            expect(wrapper.find('TokenEnablerButton').prop('disabled')).toBeFalsy();
        });

        it('should check for required fields for bacs', async () => {
            const wrapper = await asyncMount(
                <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                    <PlaygroundV1 />
                </Provider>,
            );

            syncClick(wrapper, BoxSelect, 1);

            wrapper.find('input[name="testerId"]').simulate('change', {
                target: {
                    value: 'Token',
                    name: 'testerId',
                },
            });

            axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, bankList);

            wrapper.find(SelectWrapper).at(0).prop('onChange')({
                target: {
                    name: 'currency',
                    value: 'GBP',
                },
            });
            wrapper.update();

            act(() => {
                wrapper.find('input[value="bacs"]').hostNodes().prop('onChange')({
                    target: {
                        name: 'transferDestination',
                        value: BACS,
                    },
                });
            });
            wrapper.update();
            expect(wrapper.find('input[value="bacs"]').hostNodes().prop('checked')).toBeTruthy();
            wrapper.find('input[name="devKey"]').simulate('change', {
                target: {
                    value: 't0k3n!',
                    name: 'devKey',
                },
            });
            wrapper.update();

            axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, bankList);
            await wrapper.find(SelectWrapper).at(2).prop('onChange')({
                target: {
                    name: 'country',
                    value: 'DE',
                },
            });

            await wrapper.find(Autocomplete).prop('onChange')(
                {
                    preventDefault: Function.prototype,
                },
                {
                    id: 'finapi-50050222',
                    name: '1822direkt - Frankfurter Sparkasse',
                    provider: 'finAPI',
                    country: 'DE',
                },
            );
            expect(wrapper.find('input[name="sortCode"]').length).toBe(1);

            wrapper.find('input[name="sortCode"]').simulate('change', {
                target: {
                    value: '1234',
                    name: 'sortCode',
                },
            });

            expect(wrapper.find('TokenEnablerButton').prop('disabled')).toBeTruthy();

            wrapper.find('input[name="accountNumber"]').simulate('change', {
                target: {
                    value: '12345678',
                    name: 'accountNumber',
                },
            });

            expect(wrapper.find('TokenEnablerButton').prop('disabled')).toBeFalsy();
        });

        it('should check for required fields for bankgiro', async () => {
            const wrapper = await asyncMount(
                <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                    <PlaygroundV1 />
                </Provider>,
            );

            syncClick(wrapper, BoxSelect, 1);

            wrapper.find('input[name="testerId"]').simulate('change', {
                target: {
                    value: 'Token',
                    name: 'testerId',
                },
            });

            axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, bankList);

            wrapper.find(SelectWrapper).at(0).prop('onChange')({
                target: {
                    name: 'currency',
                    value: 'SEK',
                },
            });
            wrapper.update();

            act(() => {
                wrapper.find('input[value="bankgiro"]').hostNodes().prop('onChange')({
                    target: {
                        name: 'transferDestination',
                        value: BANK_GIRO,
                    },
                });
            });
            wrapper.update();
            expect(
                wrapper.find('input[value="bankgiro"]').hostNodes().prop('checked'),
            ).toBeTruthy();
            wrapper.find('input[name="devKey"]').simulate('change', {
                target: {
                    value: 't0k3n!',
                    name: 'devKey',
                },
            });
            wrapper.update();

            axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, bankList);
            await wrapper.find(SelectWrapper).at(2).prop('onChange')({
                target: {
                    name: 'country',
                    value: 'DE',
                },
            });

            await wrapper.find(Autocomplete).prop('onChange')(
                {
                    preventDefault: Function.prototype,
                },
                {
                    id: 'finapi-50050222',
                    name: '1822direkt - Frankfurter Sparkasse',
                    provider: 'finAPI',
                    country: 'DE',
                },
            );
            wrapper.find('input[name="bankgiroNumber"]').simulate('change', {
                target: {
                    value: '12345678',
                    name: 'bankgiroNumber',
                },
            });

            expect(wrapper.find('TokenEnablerButton').prop('disabled')).toBeFalsy();
        });

        it('should check for required fields for plusgiro', async () => {
            const wrapper = await asyncMount(
                <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                    <PlaygroundV1 />
                </Provider>,
            );

            syncClick(wrapper, BoxSelect, 1);

            wrapper.find('input[name="testerId"]').simulate('change', {
                target: {
                    value: 'Token',
                    name: 'testerId',
                },
            });

            axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, bankList);

            wrapper.find(SelectWrapper).at(0).prop('onChange')({
                target: {
                    name: 'currency',
                    value: 'SEK',
                },
            });
            wrapper.update();

            act(() => {
                wrapper.find('input[value="plusgiro"]').hostNodes().prop('onChange')({
                    target: {
                        name: 'transferDestination',
                        value: PLUS_GIRO,
                    },
                });
            });
            wrapper.update();
            expect(
                wrapper.find('input[value="plusgiro"]').hostNodes().prop('checked'),
            ).toBeTruthy();

            wrapper.find('input[name="devKey"]').simulate('change', {
                target: {
                    value: 't0k3n!',
                    name: 'devKey',
                },
            });

            wrapper.update();

            axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, bankList);
            await wrapper.find(SelectWrapper).at(2).prop('onChange')({
                target: {
                    name: 'country',
                    value: 'DE',
                },
            });

            await wrapper.find(Autocomplete).prop('onChange')(
                {
                    preventDefault: Function.prototype,
                },
                {
                    id: 'finapi-50050222',
                    name: '1822direkt - Frankfurter Sparkasse',
                    provider: 'finAPI',
                    country: 'DE',
                },
            );

            wrapper.find('input[name="plusgiroNumber"]').simulate('change', {
                target: {
                    value: '12345678',
                    name: 'plusgiroNumber',
                },
            });

            expect(wrapper.find('TokenEnablerButton').prop('disabled')).toBeFalsy();
        });

        it('should show different payment methods and preselect first method based on currency', async () => {
            const wrapper = await asyncMount(
                <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                    <PlaygroundV1 />
                </Provider>,
            );

            syncClick(wrapper, BoxSelect, 1);

            expect(PlaygroundStore.form.transferDestination).toBe(SEPA);
            expect(wrapper.find('input[value="sepa"]').length).toBeGreaterThan(0);
            expect(wrapper.find('input[value="sepaInstant"]').length).toBeGreaterThan(0);

            axiosMock.onGet(/\/tokenApi\/banks/).reply(200, bankList);

            wrapper.find(SelectWrapper).at(0).prop('onChange')({
                target: {
                    name: 'currency',
                    value: 'PLN',
                },
            });
            wrapper.update();

            expect(PlaygroundStore.form.transferDestination).toBe(ELIXIR);
            expect(wrapper.find('input[value="elixir"]').length).toBeGreaterThan(0);
            expect(wrapper.find('input[value="expressElixir"]').length).toBeGreaterThan(0);
            expect(wrapper.find('input[value="blueCash"]').length).toBeGreaterThan(0);
            expect(wrapper.find('input[value="sorbnet"]').length).toBeGreaterThan(0);

            wrapper.find(SelectWrapper).at(0).prop('onChange')({
                target: {
                    name: 'currency',
                    value: 'GBP',
                },
            });
            wrapper.update();

            expect(wrapper.find('input[value="fasterPayments"]').length).toBeGreaterThan(0);
            expect(wrapper.find('input[value="bacs"]').length).toBeGreaterThan(0);
            expect(wrapper.find('input[value="chaps"]').length).toBeGreaterThan(0);

            wrapper.find(SelectWrapper).at(0).prop('onChange')({
                target: {
                    name: 'currency',
                    value: 'HUF',
                },
            });
            wrapper.update();

            expect(PlaygroundStore.form.transferDestination).toBe(EU_DOMESTIC_NON_EURO);
            expect(wrapper.find('input[value="euDomesticNonEuro"]').length).toBeGreaterThan(0);

            wrapper.find(SelectWrapper).at(0).prop('onChange')({
                target: {
                    name: 'currency',
                    value: 'NOK',
                },
            });
            wrapper.update();

            expect(PlaygroundStore.form.transferDestination).toBe(EU_DOMESTIC_NON_EURO);
            expect(wrapper.find('input[value="euDomesticNonEuro"]').length).toBeGreaterThan(0);

            wrapper.find(SelectWrapper).at(0).prop('onChange')({
                target: {
                    name: 'currency',
                    value: 'BGN',
                },
            });
            wrapper.update();

            expect(wrapper.find('input[value="euDomesticNonEuro"]').length).toBeGreaterThan(0);

            wrapper.find(SelectWrapper).at(0).prop('onChange')({
                target: {
                    name: 'currency',
                    value: 'DKK',
                },
            });
            wrapper.update();

            expect(PlaygroundStore.form.transferDestination).toBe(EU_DOMESTIC_NON_EURO);
            expect(wrapper.find('input[value="euDomesticNonEuro"]').length).toBeGreaterThan(0);
            wrapper.find(SelectWrapper).at(0).prop('onChange')({
                target: {
                    name: 'currency',
                    value: 'RON',
                },
            });
            wrapper.update();

            expect(PlaygroundStore.form.transferDestination).toBe(EU_DOMESTIC_NON_EURO);
            expect(wrapper.find('input[value="euDomesticNonEuro"]').length).toBeGreaterThan(0);
            wrapper.find(SelectWrapper).at(0).prop('onChange')({
                target: {
                    name: 'currency',
                    value: 'CZK',
                },
            });
            wrapper.update();

            expect(PlaygroundStore.form.transferDestination).toBe(EU_DOMESTIC_NON_EURO);
            expect(wrapper.find('input[value="euDomesticNonEuro"]').length).toBeGreaterThan(0);

            wrapper.find(SelectWrapper).at(0).prop('onChange')({
                target: {
                    name: 'currency',
                    value: 'SEK',
                },
            });
            wrapper.update();

            expect(PlaygroundStore.form.transferDestination).toBe(EU_DOMESTIC_NON_EURO);
            expect(wrapper.find('input[value="euDomesticNonEuro"]').length).toBeGreaterThan(0);
            expect(wrapper.find('input[value="plusgiro"]').length).toBeGreaterThan(0);
            expect(wrapper.find('input[value="bankgiro"]').length).toBeGreaterThan(0);
        });

        it('should fetch filtered banks when user is entering bank name', async () => {
            const wrapper = await asyncMount(
                <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                    <PlaygroundV1 />
                </Provider>,
            );
            syncClick(wrapper, BoxSelect, 1);

            wrapper.find('input[name="testerId"]').simulate('change', {
                target: {
                    value: 'Token',
                    name: 'testerId',
                },
            });

            wrapper.find('input[name="devKey"]').simulate('change', {
                target: {
                    value: 't0k3n!',
                    name: 'devKey',
                },
            });
            wrapper.update();

            axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, bankList);

            await wrapper.find(Autocomplete).prop('onInputChange')({
                target: {
                    name: 'bankName',
                    value: 'Aac',
                },
            });
            wrapper.update();
            expect(PlaygroundStore.banks).toEqual(bankList.banks);

            axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, {
                paging: {
                    page: 1,
                    perPage: 10,
                    pageCount: 1,
                },
            });

            await wrapper.find(Autocomplete).prop('onInputChange')({
                target: {
                    name: 'bankName',
                    value: 'abc',
                },
            });
            wrapper.update();

            expect(PlaygroundStore.banks).toEqual([]);

            axiosMock.onGet(/\/tokenApi\/banks/g).replyOnce(200, {});

            await wrapper.find(Autocomplete).prop('onInputChange')({
                target: {
                    name: 'bankName',
                    value: '',
                },
            });
            wrapper.update();

            expect(PlaygroundStore.form.bankId).toEqual('');
        });

        it('should display a list of banks if country is selected first', async () => {
            axiosMock.onGet(/\/tokenApi\/banks/g).replyOnce(200, bankList);
            const wrapper = await asyncMount(
                <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                    <PlaygroundV1 />
                </Provider>,
            );

            syncClick(wrapper, BoxSelect, 1);

            wrapper.find('input[name="testerId"]').simulate('change', {
                target: {
                    value: 'Token',
                    name: 'testerId',
                },
            });

            wrapper.find('input[name="devKey"]').simulate('change', {
                target: {
                    value: 't0k3n!',
                    name: 'devKey',
                },
            });

            wrapper.update();

            await wrapper.find(SelectWrapper).at(1).prop('onChange')({
                target: {
                    name: 'country',
                    value: 'DE',
                },
            });
            wrapper.update();

            act(() => {
                wrapper.find(Autocomplete).find('button').at(1).prop('onClick')();
            });
            wrapper.update();

            expect(wrapper.find('.MuiAutocomplete-popper').hostNodes().text()).not.toEqual(
                'No options',
            );

            const expectedList = [
                '1822direkt - Frankfurter Sparkasse-50050222',
                'Aachener Bank-39060180',
                'Aachener Bank eG',
                'OTP Banka Hungary',
            ];

            wrapper
                .find('.MuiAutocomplete-popper li')
                .hostNodes()
                .forEach((node, index) => {
                    expect(node.text()).toEqual(expectedList[index]);
                });
        });

        it('should disable bankId field if no country is selected', async () => {
            axiosMock.onGet(/\/tokenApi\/banks/g).replyOnce(200, bankList);

            const wrapper = await asyncMount(
                <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                    <PlaygroundV1 />
                </Provider>,
            );

            syncClick(wrapper, BoxSelect, 1);

            expect(wrapper.find(Autocomplete).prop('disabled')).toBeTruthy();

            wrapper.find('input[name="devKey"]').simulate('change', {
                target: {
                    value: 't0k3n!',
                    name: 'devKey',
                },
            });
            wrapper.update();

            await wrapper.find(SelectWrapper).at(1).prop('onChange')({
                target: {
                    name: 'country',
                    value: 'DE',
                },
            });
            wrapper.update();

            expect(wrapper.find(Autocomplete).prop('disabled')).toBeFalsy();
        });

        it('should require additional fields if the bank is stetpsd2', async () => {
            const wrapper = await asyncMount(
                <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                    <PlaygroundV1 />
                </Provider>,
            );

            syncClick(wrapper, BoxSelect, 1);

            await wrapper.find('input[name="testerId"]').simulate('change', {
                target: {
                    value: 'Type2TokenCallback',
                    name: 'testerId',
                },
            });

            act(() => {
                wrapper.find('input[value="sepa"]').hostNodes().prop('onChange')({
                    target: {
                        name: 'transferDestination',
                        value: SEPA,
                    },
                });
            });
            wrapper.update();

            wrapper.find('input[name="beneficiaryIban"]').simulate('change', {
                target: {
                    value: '12345678',
                    name: 'beneficiaryIban',
                },
            });

            axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, {
                banks: [
                    {
                        id: 'stet-psst',
                        name: 'La Banque Postale',
                        provider: 'stet',
                        country: 'FR',
                        identifier: '50050222',
                    },
                ],
                paging: {
                    page: 1,
                    perPage: 10,
                    pageCount: 5,
                },
            });
            await wrapper.find(SelectWrapper).at(2).prop('onChange')({
                target: {
                    name: 'country',
                    value: 'FR',
                },
            });
            wrapper.update();

            await wrapper.find(Autocomplete).prop('onChange')(
                {
                    preventDefault: Function.prototype,
                },
                {
                    id: 'stet-psst',
                    name: 'La Banque Postale',
                    provider: 'stet',
                    country: 'FR',
                    mandatoryFields: {
                        transfer: {
                            domestic: {
                                fields: [creditorName],
                                stetFields: [stet.creditorAgent],
                            },
                        },
                    },
                },
            );

            wrapper.update();
            expect(wrapper.find('TokenEnablerButton').prop('disabled')).toBeTruthy();
            axiosMock.onPut().replyOnce(200);

            await act(async () => {
                await wrapper.find('input[name="beneficiaryIban"]').simulate('change', {
                    target: {
                        value: '12345678',
                        name: 'beneficiaryIban',
                    },
                });
                await new Promise((r) => setTimeout(r, 1000));
            });
            wrapper.update();
            wrapper.find('input[name="creditorLegalName"]').simulate('change', {
                target: {
                    value: 'test',
                    name: 'creditorLegalName',
                },
            });
            wrapper.find('input[name="creditorAgentBicFi"]').simulate('change', {
                target: {
                    value: '12345678',
                    name: 'creditorAgentBicFi',
                },
            });
            wrapper.find('input[name="creditorAgentName"]').simulate('change', {
                target: {
                    value: '12345678',
                    name: 'creditorAgentName',
                },
            });
            expect(wrapper.find('TokenEnablerButton').prop('disabled')).toBeFalsy();
        });

        it('should display creditor name for web app enabled tester id ', async () => {
            const wrapper = await asyncMount(
                <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                    <PlaygroundV1 />
                </Provider>,
            );

            syncClick(wrapper, BoxSelect, 1);

            await wrapper.find('input[name="testerId"]').simulate('change', {
                target: {
                    value: 'token',
                    name: 'testerId',
                },
            });

            act(() => {
                wrapper.find('input[value="sepa"]').hostNodes().prop('onChange')({
                    target: {
                        name: 'transferDestination',
                        value: SEPA,
                    },
                });
            });
            wrapper.update();

            wrapper.find('input[name="beneficiaryIban"]').simulate('change', {
                target: {
                    value: '12345678',
                    name: 'beneficiaryIban',
                },
            });

            wrapper.find('input[name="devKey"]').simulate('change', {
                target: {
                    value: 't0k3n!',
                    name: 'devKey',
                },
            });
            wrapper.update();

            axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, {
                banks: [
                    {
                        id: 'stet-psst',
                        name: 'La Banque Postale',
                        provider: 'stet',
                        country: 'FR',
                        identifier: '50050222',
                    },
                ],
                paging: {
                    page: 1,
                    perPage: 10,
                    pageCount: 5,
                },
            });
            await wrapper.find(SelectWrapper).at(2).prop('onChange')({
                target: {
                    name: 'country',
                    value: 'FR',
                },
            });
            wrapper.update();

            await wrapper.find(Autocomplete).prop('onChange')(
                {
                    preventDefault: Function.prototype,
                },
                {
                    id: 'stet-psst',
                    name: 'La Banque Postale',
                    provider: 'stet',
                    country: 'FR',
                    mandatoryFields: {
                        transfer: {
                            domestic: {
                                fields: [creditorName],
                            },
                        },
                    },
                },
            );

            wrapper.update();

            wrapper.find('input[name="creditorLegalName"]').simulate('change', {
                target: {
                    value: 'test',
                    name: 'creditorLegalName',
                },
            });

            expect(PlaygroundStore.form.creditorLegalName).toEqual('test');
            expect(PlaygroundStore.form.webAppEnabled).toBe(true);
        });

        it('should require delivery mode if selected bank is polish bank', async () => {
            const wrapper = await asyncMount(
                <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                    <PlaygroundV1 />
                </Provider>,
            );

            syncClick(wrapper, BoxSelect, 1);

            await wrapper.find('input[name="testerId"]').simulate('change', {
                target: {
                    value: 'Type2TokenCallback',
                    name: 'testerId',
                },
            });

            act(() => {
                wrapper.find('input[value="sepa"]').hostNodes().prop('onChange')({
                    target: {
                        name: 'transferDestination',
                        value: SEPA,
                    },
                });
            });
            wrapper.find('input[name="devKey"]').simulate('change', {
                target: {
                    value: 't0k3n!',
                    name: 'devKey',
                },
            });

            wrapper.update();

            await wrapper.find(SelectWrapper).at(2).prop('onChange')({
                target: {
                    name: 'country',
                    value: 'FR',
                },
            });
            wrapper.update();

            axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, {
                banks: [
                    {
                        id: 'pa-alior',
                        name: 'Alior Bank',
                        openBankingStandard: POLISH_API,
                        country: 'FR',
                        mandatoryFields: {
                            transfer: {
                                domestic: {
                                    fields: [creditorName, debtorAccount, debtorName],
                                    polishapiFields: [polishApi.deliveryMode],
                                },
                            },
                        },
                    },
                ],
                paging: {
                    page: 1,
                    perPage: 10,
                    pageCount: 5,
                },
            });

            await wrapper.find(Autocomplete).prop('onChange')(
                {
                    preventDefault: Function.prototype,
                },
                {
                    id: 'pa-alior',
                    name: 'Alior Bank',
                    openBankingStandard: POLISH_API,
                    country: 'FR',
                    mandatoryFields: {
                        transfer: {
                            domestic: {
                                fields: [debtorName, creditorName],
                                polishapiFields: [polishApi.deliveryMode],
                            },
                        },
                    },
                },
            );
            axiosMock.onPut(/\/api\/playground\/validate-iban/).reply(200);

            await act(async () => {
                await wrapper.find('input[name="beneficiaryIban"]').simulate('change', {
                    target: {
                        value: '12345678',
                        name: 'beneficiaryIban',
                    },
                });
                await new Promise((r) => setTimeout(r, 1000));
            });

            wrapper.update();
            expect(wrapper.find('TokenEnablerButton').prop('disabled')).toBeTruthy();

            wrapper.find('input[name="creditorLegalName"]').simulate('change', {
                target: {
                    value: 'test',
                    name: 'creditorLegalName',
                },
            });

            await wrapper.find(SelectWrapper).at(2).prop('onChange')({
                target: {
                    name: 'deliveryMode',
                    value: EXPRESS_D0,
                },
            });

            wrapper.find('input[name="debtorLegalName"]').simulate('change', {
                target: {
                    value: 'test',
                    name: 'debtorLegalName',
                },
            });
            wrapper.update();

            expect(wrapper.find('TokenEnablerButton').prop('disabled')).toBeFalsy();
        });

        it('should disable country selection unless currency is EUR', async () => {
            axiosMock.onGet(/\/tokenApi\/banks/g).reply(200, bankList);

            const wrapper = await asyncMount(
                <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                    <PlaygroundV1 />
                </Provider>,
            );

            syncClick(wrapper, BoxSelect, 1);

            wrapper.find('input[name="testerId"]').simulate('change', {
                target: {
                    value: 'Token',
                    name: 'testerId',
                },
            });

            wrapper.find(SelectWrapper).at(0).prop('onChange')({
                target: {
                    name: 'currency',
                    value: 'PLN',
                },
            });
            wrapper.update();
            expect(PlaygroundStore.form.country).toBe('PL');
            expect(wrapper.find(SelectWrapper).at(1).prop('disabled')).toBeTruthy();

            wrapper.find(SelectWrapper).at(0).prop('onChange')({
                target: {
                    name: 'currency',
                    value: 'EUR',
                },
            });
            wrapper.update();
            expect(PlaygroundStore.form.country).toBe('PL');
            expect(wrapper.find(SelectWrapper).at(1).prop('disabled')).toBeFalsy();
        });

        it('should preselect countries for non EUR currencies on currency change', async () => {
            axiosMock.onGet(/\/tokenApi\/banks/g).reply(200, bankList);

            const wrapper = await asyncMount(
                <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                    <PlaygroundV1 />
                </Provider>,
            );

            syncClick(wrapper, BoxSelect, 1);

            wrapper.find(SelectWrapper).at(0).prop('onChange')({
                target: {
                    name: 'currency',
                    value: 'PLN',
                },
            });
            wrapper.update();
            expect(PlaygroundStore.form.country).toBe('PL');

            wrapper.find(SelectWrapper).at(0).prop('onChange')({
                target: {
                    name: 'currency',
                    value: 'GBP',
                },
            });
            wrapper.update();
            expect(PlaygroundStore.form.country).toBe('GB');

            wrapper.find(SelectWrapper).at(0).prop('onChange')({
                target: {
                    name: 'currency',
                    value: 'HUF',
                },
            });
            wrapper.update();
            expect(PlaygroundStore.form.country).toBe('HU');

            wrapper.find(SelectWrapper).at(0).prop('onChange')({
                target: {
                    name: 'currency',
                    value: 'NOK',
                },
            });
            wrapper.update();
            expect(PlaygroundStore.form.country).toBe('NO');

            wrapper.find(SelectWrapper).at(0).prop('onChange')({
                target: {
                    name: 'currency',
                    value: 'BGN',
                },
            });
            wrapper.update();
            expect(PlaygroundStore.form.country).toBe('BG');

            wrapper.find(SelectWrapper).at(0).prop('onChange')({
                target: {
                    name: 'currency',
                    value: 'DKK',
                },
            });
            wrapper.update();
            expect(PlaygroundStore.form.country).toBe('DK');

            wrapper.find(SelectWrapper).at(0).prop('onChange')({
                target: {
                    name: 'currency',
                    value: 'CZK',
                },
            });
            wrapper.update();
            expect(PlaygroundStore.form.country).toBe('CZ');
        });

        it('should show no options if no banks are found', async () => {
            axiosMock.onGet(/\/tokenApi\/banks/g).replyOnce(200, {
                paging: {
                    page: 1,
                    perPage: 10,
                    pageCount: 1,
                },
            });
            const wrapper = await asyncMount(
                <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                    <PlaygroundV1 />
                </Provider>,
            );

            syncClick(wrapper, BoxSelect, 1);

            await wrapper.find(SelectWrapper).at(1).prop('onChange')({
                target: {
                    name: 'country',
                    value: 'DE',
                },
            });
            wrapper.update();

            act(() => {
                wrapper.find(Autocomplete).find('button').at(1).prop('onClick')();
            });
            wrapper.update();

            expect(wrapper.find('.MuiAutocomplete-popper').hostNodes().text()).toEqual(
                'No options',
            );
            expect(PlaygroundStore.banks).toEqual([]);
            expect(PlaygroundStore.form.bankId).toEqual('');
            expect(PlaygroundStore.selectedBank).toEqual(null);
        });

        it('should handle clearing bankId', async () => {
            axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, bankList);
            const spy = jest.spyOn(PlaygroundStore, 'handleAutocomplete');

            const wrapper = await asyncMount(
                <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                    <PlaygroundV1 />
                </Provider>,
            );

            syncClick(wrapper, BoxSelect, 1);

            await wrapper.find(SelectWrapper).at(1).prop('onChange')({
                target: {
                    name: 'country',
                    value: 'DE',
                },
            });
            wrapper.find('input[name="devKey"]').simulate('change', {
                target: {
                    value: 't0k3n!',
                    name: 'devKey',
                },
            });

            wrapper.update();

            axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, bankList);

            await wrapper.find(Autocomplete).prop('onInputChange')({
                target: {
                    name: 'bankName',
                    value: 'Aac',
                },
            });
            wrapper.update();

            axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, bankList);

            await wrapper.find(Autocomplete).prop('onChange')({
                preventDefault: Function.prototype,
            });
            wrapper.update();

            expect(spy).toHaveBeenCalled();
            expect(PlaygroundStore.form.bankId).toEqual('');
            expect(PlaygroundStore.selectedBank).toEqual(null);
        });

        it('should automatically uppercase iban and bic', async () => {
            const wrapper = await asyncMount(
                <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                    <PlaygroundV1 />
                </Provider>,
            );

            syncClick(wrapper, BoxSelect, 1);

            act(() => {
                wrapper.find('input[value="sepa"]').hostNodes().prop('onChange')({
                    target: {
                        name: 'transferDestination',
                        value: SEPA,
                    },
                });
            });
            wrapper.update();

            wrapper.find('input[name="beneficiaryIban"]').simulate('change', {
                target: {
                    value: 'iban',
                    name: 'beneficiaryIban',
                },
            });

            wrapper.find('input[name="beneficiaryBic"]').simulate('change', {
                target: {
                    value: 'bic',
                    name: 'beneficiaryBic',
                },
            });

            expect(PlaygroundStore.form.beneficiaryIban).toEqual('IBAN');
            expect(PlaygroundStore.form.beneficiaryBic).toEqual('BIC');
        });

        it('should render debtor details fields if debtorAccount is true in bank mandatoryFields', async () => {
            const wrapper = await asyncMount(
                <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                    <PlaygroundV1 />
                </Provider>,
            );

            syncClick(wrapper, BoxSelect, 1);

            wrapper.find('input[name="devKey"]').simulate('change', {
                target: {
                    value: 't0k3n!',
                    name: 'devKey',
                },
            });

            wrapper.update();

            axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, bankList);
            await wrapper.find(SelectWrapper).at(0).prop('onChange')({
                target: {
                    name: 'country',
                    value: 'HU',
                },
            });

            await wrapper.find(Autocomplete).prop('onChange')(
                {
                    preventDefault: Function.prototype,
                },
                {
                    id: 'sk-okhb',
                    name: 'K&H Bank',
                    provider: 'Sparkasse',
                    country: 'HU',
                    mandatoryFields: {
                        transfer: {
                            domestic: {
                                fields: [debtorAccount, debtorName, debtorBic],
                            },
                        },
                    },
                },
            );
            wrapper.update();

            publicRuntimeConfig.playground.testerIds.push('Type2TokenCallback');
            wrapper.find('input[name="testerId"]').simulate('change', {
                target: {
                    value: 'Type2TokenCallback',
                    name: 'testerId',
                },
            });
            wrapper.find('input[name="debtorLegalName"]').simulate('change', {
                target: {
                    value: 'John',
                    name: 'debtorLegalName',
                },
            });
            wrapper.find('input[name="debtorIban"]').simulate('change', {
                target: {
                    value: '12345667889',
                    name: 'debtorIban',
                },
            });
            wrapper.find('input[name="debtorBic"]').simulate('change', {
                target: {
                    value: '123456',
                    name: 'debtorBic',
                },
            });

            axiosMock.onPut(/\/api\/playground\/validate-iban/).reply(200);
            await act(async () => {
                await wrapper.find('input[name="beneficiaryIban"]').simulate('change', {
                    target: {
                        value: '12345678',
                        name: 'beneficiaryIban',
                    },
                });
                await new Promise((r) => setTimeout(r, 1000));
            });
            wrapper.update();

            expect(wrapper.find('TokenEnablerButton').prop('disabled')).toBeFalsy();
        });

        it('should render address fields if address is true in bank mandatoryFields', async () => {
            const wrapper = await asyncMount(
                <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                    <PlaygroundV1 />
                </Provider>,
            );

            syncClick(wrapper, BoxSelect, 1);

            axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, bankList);
            await wrapper.find(SelectWrapper).at(0).prop('onChange')({
                target: {
                    name: 'country',
                    value: 'PL',
                },
            });

            await wrapper.find(Autocomplete).prop('onChange')(
                {
                    preventDefault: Function.prototype,
                },
                {
                    id: 'pa-agricole',
                    name: 'Credit Agricole',

                    provider: 'Polish API',
                    country: 'PL',
                    supportedTransferDestinationTypes: ['ELIXIR', 'SWIFT', 'SEPA'],
                    openBankingStandard: 'PolishAPI',
                    countries: ['PL'],
                    mandatoryFields: {
                        transfer: {
                            domestic: {
                                fields: [
                                    'transfer_body.instructions.transfer_destinations.customer_data.legal_names',
                                    'transfer_body.instructions.transfer_destinations.customer_data.address.street',
                                    'transfer_body.instructions.transfer_destinations.customer_data.address.house_number',
                                    'transfer_body.instructions.transfer_destinations.customer_data.address.post_code',
                                    'transfer_body.instructions.transfer_destinations.customer_data.address.country',
                                    'transfer_body.instructions.transfer_destinations.customer_data.address.city',
                                ],
                            },
                        },
                    },
                },
            );
            wrapper.update();

            publicRuntimeConfig.playground.testerIds.push('Type2TokenCallback');
            wrapper.find('input[name="testerId"]').simulate('change', {
                target: {
                    value: 'Type2TokenCallback',
                    name: 'testerId',
                },
            });
            wrapper.find('input[name="creditorLegalName"]').simulate('change', {
                target: {
                    value: 'creditor legal name',
                    name: 'creditorLegalName',
                },
            });
            wrapper.find('input[name="addressStreet"]').simulate('change', {
                target: {
                    value: '999 arbor ct dr',
                    name: 'addressStreet',
                },
            });
            wrapper.find('input[name="addressHouseNumber"]').simulate('change', {
                target: {
                    value: '123',
                    name: 'addressHouseNumber',
                },
            });
            wrapper.find('input[name="addressPostCode"]').simulate('change', {
                target: {
                    value: '60187',
                    name: 'addressPostCode',
                },
            });
            wrapper.find('input[name="addressCity"]').simulate('change', {
                target: {
                    value: 'detroit',
                    name: 'addressCity',
                },
            });
            wrapper.find('input[name="addressCountry"]').simulate('change', {
                target: {
                    value: 'us',
                    name: 'addressCountry',
                },
            });

            axiosMock.onPut(/\/api\/playground\/validate-iban/).reply(200);
            await act(async () => {
                await wrapper.find('input[name="beneficiaryIban"]').simulate('change', {
                    target: {
                        value: '12345678',
                        name: 'beneficiaryIban',
                    },
                });
                await new Promise((r) => setTimeout(r, 1000));
            });
            wrapper.update();

            expect(wrapper.find('TokenEnablerButton').prop('disabled')).toBeFalsy();
        });

        it('should render bban and clearing number fields if present in bank mandatoryFields', async () => {
            const wrapper = await asyncMount(
                <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                    <PlaygroundV1 />
                </Provider>,
            );

            syncClick(wrapper, BoxSelect, 1);

            wrapper.find('input[name="devKey"]').simulate('change', {
                target: {
                    value: 't0k3n!',
                    name: 'devKey',
                },
            });

            wrapper.update();

            axiosMock.onGet(/\/tokenApi\/banks/).replyOnce(200, bankList);
            await wrapper.find(SelectWrapper).at(0).prop('onChange')({
                target: {
                    name: 'currency',
                    value: 'SEK',
                },
            });

            await wrapper.find(Autocomplete).prop('onChange')(
                {
                    preventDefault: Function.prototype,
                },
                {
                    id: 'ngp-swed-08191',
                    name: 'Bergslagens Sparbank AB',
                    provider: 'NextGenPSD2',
                    country: 'SE',
                    supportedTransferDestinationTypes: ['EU_DOMESTIC_NON_EURO', 'SEPA'],
                    openBankingStandard: 'NextGenPSD2',
                    countries: ['SE'],
                    mandatoryFields: {
                        transfer: {
                            domestic: {
                                fields: [
                                    'transfer_body.instructions.transfer_destinations.customer_data.legal_names',
                                    'transfer_body.instructions.transfer_destinations.eu_domestic_non_euro.bban',
                                    'transfer_body.instructions.transfer_destinations.eu_domestic_non_euro.clearing_number',
                                ],
                            },
                        },
                    },
                },
                'select-option',
            );
            wrapper.update();

            publicRuntimeConfig.playground.testerIds.push('Type2TokenCallback');
            wrapper.find('input[name="testerId"]').simulate('change', {
                target: {
                    value: 'Type2TokenCallback',
                    name: 'testerId',
                },
            });
            wrapper.find('input[name="creditorLegalName"]').simulate('change', {
                target: {
                    value: 'creditor legal name',
                    name: 'creditorLegalName',
                },
            });
            wrapper.find('input[name="bban"]').simulate('change', {
                target: {
                    value: '12345678',
                    name: 'bban',
                },
            });
            wrapper.find('input[name="clearingNumber"]').simulate('change', {
                target: {
                    value: '123',
                    name: 'clearingNumber',
                },
            });
            wrapper.update();

            expect(wrapper.find('TokenEnablerButton').prop('disabled')).toBeFalsy();
        });

        it('should call getTokenRequestUrl in PlaygroundStore', async () => {
            PlaygroundStore.form.requestType = 'singlePayment';
            const spy = jest.spyOn(PlaygroundStore, 'getTokenRequestUrl');

            await PlaygroundStore.getTokenRequestUrl();
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('VariablePaymentServices', () => {
        let VrpStore;
        beforeEach(() => {
            VrpStore = new _VrpStore();
        });

        it('should render VRP Box when enableVrpTesterId is provided', async () => {
            const wrapper = await asyncMount(
                <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore} VrpStore={VrpStore}>
                    <PlaygroundV1 />
                </Provider>,
            );
            expect(wrapper.find(BoxSelect).length).toEqual(2);
            await wrapper.find('input[name="testerId"]').simulate('change', {
                target: {
                    value: 'type2tppcallback',
                    name: 'testerId',
                },
            });
            await wrapper.update();
            expect(wrapper.find(BoxSelect).length).toEqual(3);
            syncClick(wrapper, BoxSelect, 2);
        });

        it('should render VRP Box when type2tppcallbackwebApp is provided', async () => {
            const wrapper = await asyncMount(
                <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore} VrpStore={VrpStore}>
                    <PlaygroundV1 />
                </Provider>,
            );
            expect(wrapper.find(BoxSelect).length).toEqual(2);
            await wrapper.find('input[name="testerId"]').simulate('change', {
                target: {
                    value: 'type2tppcallbackwebApp',
                    name: 'testerId',
                },
            });
            await wrapper.update();
            expect(wrapper.find(BoxSelect).length).toEqual(3);
            syncClick(wrapper, BoxSelect, 2);
        });

        it('should switch to VRPInitiation tab when user click on it', async () => {
            const wrapper = await asyncMount(
                <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore} VrpStore={VrpStore}>
                    <PlaygroundV1 />
                </Provider>,
            );
            await wrapper.find('input[name="testerId"]').simulate('change', {
                target: {
                    value: 'type2tppcallback',
                    name: 'testerId',
                },
            });
            syncClick(wrapper, BoxSelect, 2);
            await wrapper.update();

            // Wait for use effect to run
            await act(async () => {
                jest.runAllTimers();
            });
            await wrapper.update();
            axiosMock.onGet(/\/api\/playground\/vrp-consents/g).replyOnce(200, {
                vrpConsents: [],
                pageInfo: {
                    offset: String(parseInt('50') + 50),
                    limit: 50,
                },
            });
            syncClick(wrapper, Tab, 3);
            expect(wrapper.find(Tab).at(2).find('button').hasClass('Mui-selected')).toEqual(false);
            expect(wrapper.find(Tab).at(3).find('button').hasClass('Mui-selected')).toEqual(true);
        });
    });

    describe('Validation', () => {
        it('should display error text if testerId is invalid', async () => {
            const wrapper = await asyncMount(
                <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                    <PlaygroundV1 />
                </Provider>,
            );

            wrapper.find('input[name="testerId"]').simulate('change', {
                target: {
                    value: 'invalid',
                    name: 'testerId',
                },
            });

            expect(wrapper.find('p.Mui-error').text()).toEqual('Invalid Tester Id');
            expect(wrapper.find('TokenEnablerButton').prop('disabled')).toBeTruthy();
        });

        it('should display error text if iban is invalid', async () => {
            const wrapper = await asyncMount(
                <Provider AppStore={AppStore} PlaygroundStore={PlaygroundStore}>
                    <PlaygroundV1 />
                </Provider>,
            );

            syncClick(wrapper, BoxSelect, 1);

            axiosMock
                .onGet(
                    /\/testerId-info\?testerId=Type2TokenCallback&memberType=type2&tppCallback=false/,
                )
                .replyOnce(200, { memberId: memberId, countryCodeList: countryCodeList });
            axiosMock.onPut(/\/api\/playground\/validate-iban/).reply(400);

            publicRuntimeConfig.playground.testerIds.push('Type2TokenCallback');
            wrapper.find('input[name="testerId"]').simulate('change', {
                target: {
                    value: 'Type2TokenCallback',
                    name: 'testerId',
                },
            });

            await act(async () => {
                await wrapper.find('input[name="beneficiaryIban"]').simulate('change', {
                    target: {
                        value: '12345678',
                        name: 'beneficiaryIban',
                    },
                });
                await new Promise((r) => setTimeout(r, 1000));
            });
            await wrapper.update();
            expect(wrapper.find('.beneficiaryIban p.Mui-error').text()).toEqual('Invalid Iban');
            expect(wrapper.find('TokenEnablerButton').prop('disabled')).toBeTruthy();
        });
    });

    describe('Error', () => {
        it('should display error text if getTppMemberId call fails', async () => {
            console.error.expectError('Request failed with status code 404');
            axiosMock.reset();
            axiosMock.onGet().reply(404, 'Bad Request');
            await PlaygroundStore.getTppMemberId();
        });
    });
});
