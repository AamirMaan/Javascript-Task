import { Grid, InputAdornment, MenuItem, Tab, Tabs, TextField } from '@material-ui/core';
import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import { inject, observer } from 'mobx-react';
import PropTypes from 'prop-types';
import React, { useEffect } from 'react';
import isTesterIdWhiteListed from 'helpers/is-testerId-white-listed/isTesterIdWhiteListed';
import AppController from '../../base/App.controller';
import successIcon from '../../images/password-reset.svg';
import DefaultContainer from '../../layout/DefaultContainer';
import BoxSelect from '../common/boxSelect/BoxSelect';
import GenericSuccessModal from '../common/modals/success/GenericSuccess';
import SupportTicketModal from '../common/modals/support-ticket/SupportTicket';
import CustomThemeProvider from '../common/theme/CustomThemeProvider';
import FormWrapper from '../common/wrappers/FormWrapper';
import SelectWrapper from '../common/wrappers/SelectWrapper';
import TextFieldWrapper from '../common/wrappers/TextFieldWrapper';
import TokenEnablerButton from './TokenEnablerButton';
import PlaygroundRadio from './PlaygroundRadio';
import deliveryModes from '../../constants/deliveryModes';
import mandatoryFields from 'constants/mandatoryFields';
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
} from '../../constants/playground';
import Autocomplete from '@material-ui/lab/Autocomplete/Autocomplete';
import GenericErrorModal from '../common/modals/error/GenericError';
import Spinner from '../common/spinner/Spinner';
import _get from 'lodash/get';
import PlaygroundTabContent from './PlaygroundTabContent';

const { publicRuntimeConfig } = require('next/config').default();

function PlaygroundV1({ AppStore, PlaygroundStore, isMobile }) {
    const { t } = AppController.getTranslation(AppStore.scope, 'playground');
    const {
        form,
        handleClick,
        handleChange,
        changeForm,
        handleCheck,
        isFormFilled,
        dataParams,
        authTypes,
        amounts,
        supportTicketLink,
        generateValues,
        isCrowdSource,
        handleCountryChange,
        banks,
        getFilteredBanks,
        handleAutocomplete,
        selectedBank,
        handleMetadataChange,
        handleCredentialFieldsChange,
        validateIban,
        isIbanLoading,
        env,
        getTokenEnv,
        getTppMemberId,
        countries,
        vrp,
        vrpTabs,
        vrpTabValue,
        handleVrpTabChange,
        vrpEnabledTesterId,
    } = PlaygroundStore;
    const ref = React.createRef();
    const [isFormValid, setFormValid] = React.useState(false);
    const { currencies } = publicRuntimeConfig.playground;

    useEffect(() => {
        const result = isFormFilled && ref.current.checkValidity();
        setFormValid(result);
    }, [Object.values(form), Object.values(form.metadata)]);

    useEffect(() => {
        generateValues();
        if (window && window.localStorage.getItem('testerId')) {
            changeForm('testerId', localStorage.getItem('testerId'));
        }
    }, []);

    useEffect(() => {
        getTokenEnv();
        getTppMemberId();
    }, []);

    useEffect(() => {
        handleChange({
            target: {
                name: 'customizationId',
                value: _get(
                    publicRuntimeConfig,
                    `customizationIdsByTesterId.${form.testerId.toLowerCase()}.${form.requestType}`,
                    '',
                ),
            },
        });
    }, [form.testerId, form.requestType]);

    const ActiveTab = vrpTabs[vrpTabValue];

    const _validateTesterId = (testerId) => {
        if (!isTesterIdWhiteListed(testerId)) {
            return t('common:invalidTesterId');
        }
        getTppMemberId();
    };

    const isIbanOptional = () => {
        const fields = selectedBank?.mandatoryFields?.transfer?.domestic?.fields;
        if (!fields?.includes(mandatoryFields.bban)) return true;
        return false;
    };

    const _renderBeneficiaryDetails = (transferDestination) => {
        let contents;
        switch (transferDestination) {
            case EU_DOMESTIC_NON_EURO:
            case SEPA:
            case SEPA_INSTANT:
                contents = (
                    <>
                        <Grid item xs={6}>
                            <TextFieldWrapper
                                name="beneficiaryIban"
                                type="text"
                                label={t('beneficiaryIban')}
                                value={form.beneficiaryIban}
                                onChange={handleChange}
                                asyncCustomError={(iban) => validateIban(iban, t)}
                                InputProps={{
                                    readOnly: false,
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            {isIbanLoading && (
                                                <Spinner
                                                    type={Spinner.TYPE_SMALL}
                                                    color={Spinner.COLOR_SECONDARY}
                                                />
                                            )}
                                        </InputAdornment>
                                    ),
                                }}
                                required={isIbanOptional()}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextFieldWrapper
                                name="beneficiaryBic"
                                type="text"
                                label={t('beneficiaryBic')}
                                value={form.beneficiaryBic}
                                onChange={handleChange}
                            />
                        </Grid>
                    </>
                );
                break;
            case ELIXIR:
            case EXPRESS_ELIXIR:
            case SORBNET:
            case BLUE_CASH:
                contents = (
                    <>
                        <Grid item xs={6}>
                            <TextFieldWrapper
                                name="accountNumber"
                                type="text"
                                label={t('accountNumber')}
                                value={form.accountNumber}
                                onChange={handleChange}
                                required
                            />
                        </Grid>
                    </>
                );
                break;
            case BANK_GIRO:
                contents = (
                    <>
                        <Grid item xs={6}>
                            <TextFieldWrapper
                                name="bankgiroNumber"
                                type="text"
                                label={t('bankgiroNumber')}
                                value={form.bankgiroNumber}
                                onChange={handleChange}
                                required
                            />
                        </Grid>
                    </>
                );
                break;
            case PLUS_GIRO:
                contents = (
                    <>
                        <Grid item xs={6}>
                            <TextFieldWrapper
                                name="plusgiroNumber"
                                type="text"
                                label={t('plusgiroNumber')}
                                value={form.plusgiroNumber}
                                onChange={handleChange}
                                required
                            />
                        </Grid>
                    </>
                );
                break;
            case FASTER_PAYMENTS:
                contents = (
                    <>
                        <Grid item xs={6}>
                            <TextFieldWrapper
                                name="accountNumber"
                                type="text"
                                label={t('accountNumber')}
                                value={form.accountNumber}
                                onChange={handleChange}
                                required
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextFieldWrapper
                                name="sortCode"
                                type="text"
                                label={t('sortCode')}
                                value={form.sortCode}
                                onChange={handleChange}
                                required
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextFieldWrapper
                                name="instructionIdentification"
                                type="text"
                                label={t('instructionIdentification')}
                                value={form.instructionIdentification}
                                onChange={handleChange}
                            />
                        </Grid>
                    </>
                );
                break;
            case CHAPS:
            case BACS:
                contents = (
                    <>
                        <Grid item xs={6}>
                            <TextFieldWrapper
                                name="accountNumber"
                                type="text"
                                label={t('accountNumber')}
                                value={form.accountNumber}
                                onChange={handleChange}
                                required
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextFieldWrapper
                                name="sortCode"
                                type="text"
                                label={t('sortCode')}
                                value={form.sortCode}
                                onChange={handleChange}
                                required
                            />
                        </Grid>
                    </>
                );
                break;
        }

        return (
            <Grid container spacing={4}>
                {contents}
                {selectedBank?.mandatoryFields && _renderMandatoryFields()}
                <Grid item xs={6}>
                    <SelectWrapper
                        name="amount"
                        label={t('amount')}
                        value={form.amount}
                        onChange={handleChange}
                        required>
                        {amounts.map((s) => (
                            <MenuItem key={s} value={s}>
                                {s}
                            </MenuItem>
                        ))}
                    </SelectWrapper>
                </Grid>
                <Grid item xs={6}>
                    <TextFieldWrapper
                        name="description"
                        type="text"
                        label={t('description')}
                        value={form.description}
                        onChange={handleChange}
                        required
                    />
                </Grid>
                <Grid item xs={6}>
                    <TextFieldWrapper
                        name="refId"
                        type="text"
                        label={t('refId')}
                        value={form.refId}
                        onChange={handleChange}
                        required
                        disabled
                    />
                </Grid>
                <Grid item xs={6} className="checkbox-item">
                    <FormControlLabel
                        control={
                            <Checkbox
                                onChange={handleCheck}
                                name={'returnRefundAccount'}
                                checked={!!form['returnRefundAccount']}
                            />
                        }
                        label={t('Support Read Refund Flag')}
                    />
                </Grid>
            </Grid>
        );
    };

    const _renderFields = (requestType) => {
        switch (requestType) {
            case 'accountServices':
                return (
                    <Grid container spacing={4}>
                        <Grid item xs={6}>
                            <TextFieldWrapper
                                name="description"
                                type="text"
                                label={t('description')}
                                value={form.description}
                                onChange={handleChange}
                                required
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextFieldWrapper
                                name="refId"
                                type="text"
                                label={t('refId')}
                                value={form.refId}
                                onChange={handleChange}
                                required
                                disabled
                            />
                        </Grid>
                    </Grid>
                );
            case 'singlePayment':
                return (
                    <Grid container spacing={4}>
                        <Grid item xs={6}>
                            <SelectWrapper
                                name="currency"
                                label={t('currency')}
                                value={form.currency}
                                onChange={handleChange}
                                required>
                                {currencies.map((s) => (
                                    <MenuItem key={s} value={s}>
                                        {s}
                                    </MenuItem>
                                ))}
                            </SelectWrapper>
                        </Grid>
                        <Grid item xs={6}>
                            {form.currency && <PlaygroundRadio />}
                        </Grid>
                    </Grid>
                );
        }
    };

    const _renderCredentialFields = () => {
        return (
            <Grid container spacing={4}>
                {selectedBank?.credentialFields.map((key) => {
                    return (
                        <Grid item xs={6} key={key.id}>
                            <TextFieldWrapper
                                name={key.id}
                                type="text"
                                label={key.displayName}
                                value={form.credentialFields[key.id]}
                                onChange={handleCredentialFieldsChange}
                                required
                            />
                        </Grid>
                    );
                })}
            </Grid>
        );
    };

    const _renderAISMandatoryFields = () => {
        const { fields } = selectedBank.mandatoryFields?.access;

        return (
            <Grid container spacing={4}>
                {fields?.includes(mandatoryFields.iban) && !form.webAppEnabled && (
                    <Grid item xs={6}>
                        <TextFieldWrapper
                            name="accessIban"
                            type="text"
                            label={t('debtorIban')}
                            value={form.accessIban}
                            onChange={handleChange}
                            required={!form.webAppEnabled}
                        />
                    </Grid>
                )}
                {fields?.includes(mandatoryFields.currency) && !form.webAppEnabled && (
                    <Grid item xs={6}>
                        <TextFieldWrapper
                            name="accessCurrency"
                            type="text"
                            label={t('currency')}
                            value={form.accessCurrency}
                            onChange={handleChange}
                            required
                        />
                    </Grid>
                )}
            </Grid>
        );
    };

    const _renderMandatoryFields = () => {
        const { domestic } = selectedBank.mandatoryFields.transfer;
        const { fields, stetFields, polishapiFields } = domestic;

        return (
            <>
                {stetFields?.includes(mandatoryFields.stet.creditorAgent) && !form.webAppEnabled && (
                    <>
                        <Grid item xs={6}>
                            <TextFieldWrapper
                                name="creditorAgentBicFi"
                                type="text"
                                label={t('bicFi')}
                                value={form.metadata.creditorAgentBicFi}
                                onChange={handleMetadataChange}
                                required
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextFieldWrapper
                                name="creditorAgentName"
                                type="text"
                                label={t('creditorAgentName')}
                                value={form.metadata.creditorAgentName}
                                onChange={handleMetadataChange}
                                required
                            />
                        </Grid>
                    </>
                )}
                {/** Note: this bypasses the !form.webAppEnabled boolean. APE-717 */}
                {fields?.includes(mandatoryFields.creditorName) && (
                    <Grid item xs={6}>
                        <TextFieldWrapper
                            name="creditorLegalName"
                            type="text"
                            label={t('creditor')}
                            value={form.creditorLegalName}
                            onChange={handleChange}
                            required={!form.webAppEnabled}
                        />
                    </Grid>
                )}
                {fields?.includes(mandatoryFields.debtorAccount) && !form.webAppEnabled && (
                    <Grid item xs={6}>
                        <TextFieldWrapper
                            name="debtorIban"
                            type="text"
                            label={t('debtorIban')}
                            value={form.debtorIban}
                            onChange={handleChange}
                            required
                        />
                    </Grid>
                )}
                {fields?.includes(mandatoryFields.debtorBic) && !form.webAppEnabled && (
                    <Grid item xs={6}>
                        <TextFieldWrapper
                            name="debtorBic"
                            type="text"
                            label={t('debtorBic')}
                            value={form.debtorBic}
                            onChange={handleChange}
                            required
                        />
                    </Grid>
                )}
                {fields?.includes(mandatoryFields.debtorName) && !form.webAppEnabled && (
                    <Grid item xs={6}>
                        <TextFieldWrapper
                            name="debtorLegalName"
                            type="text"
                            label={t('debtor')}
                            value={form.debtorLegalName}
                            onChange={handleChange}
                            required
                        />
                    </Grid>
                )}
                {fields?.includes(mandatoryFields.addressStreet) && !form.webAppEnabled && (
                    <Grid item xs={6}>
                        <TextFieldWrapper
                            name="addressStreet"
                            type="text"
                            label={t('Creditor Street Address')}
                            value={form.addressStreet}
                            onChange={handleChange}
                            required
                        />
                    </Grid>
                )}
                {fields?.includes(mandatoryFields.addressHouseNumber) && !form.webAppEnabled && (
                    <Grid item xs={6}>
                        <TextFieldWrapper
                            name="addressHouseNumber"
                            type="text"
                            label={t('Creditor House Number')}
                            value={form.addressHouseNumber}
                            onChange={handleChange}
                            required
                        />
                    </Grid>
                )}
                {fields?.includes(mandatoryFields.addressPostCode) && !form.webAppEnabled && (
                    <Grid item xs={6}>
                        <TextFieldWrapper
                            name="addressPostCode"
                            type="text"
                            label={t('Creditor Post Code')}
                            value={form.addressPostCode}
                            onChange={handleChange}
                            required
                        />
                    </Grid>
                )}
                {fields?.includes(mandatoryFields.addressCity) && !form.webAppEnabled && (
                    <Grid item xs={6}>
                        <TextFieldWrapper
                            name="addressCity"
                            type="text"
                            label={t('Creditor City')}
                            value={form.addressCity}
                            onChange={handleChange}
                            required
                        />
                    </Grid>
                )}
                {fields?.includes(mandatoryFields.addressCountry) && !form.webAppEnabled && (
                    <Grid item xs={6}>
                        <TextFieldWrapper
                            name="addressCountry"
                            type="text"
                            label={t('Creditor Country')}
                            value={form.addressCountry}
                            onChange={handleChange}
                            required
                        />
                    </Grid>
                )}
                {polishapiFields?.includes(mandatoryFields.polishApi.deliveryMode) &&
                    !form.webAppEnabled && (
                    <Grid item xs={6}>
                        <SelectWrapper
                            name="deliveryMode"
                            label={t('deliveryMode')}
                            value={form.metadata.deliveryMode}
                            onChange={handleMetadataChange}
                            required>
                            {Object.keys(deliveryModes).map((d) => (
                                <MenuItem key={d} value={d}>
                                    {t(d)}
                                </MenuItem>
                            ))}
                        </SelectWrapper>
                    </Grid>
                )}
                {fields?.includes(mandatoryFields.bban) && (
                    <Grid item xs={6}>
                        <TextFieldWrapper
                            name="bban"
                            type="text"
                            label={t('bban')}
                            value={form.bban}
                            onChange={handleChange}
                            required
                        />
                    </Grid>
                )}
                {fields?.includes(mandatoryFields.clearingNumber) && (
                    <Grid item xs={6}>
                        <TextFieldWrapper
                            name="clearingNumber"
                            type="text"
                            label={t('clearingNumber')}
                            value={form.clearingNumber}
                            onChange={handleChange}
                            required
                        />
                    </Grid>
                )}
            </>
        );
    };

    return (
        <>
            <PlaygroundTabContent />
            <div className="playground">
                <>
                    <Grid container spacing={4}>
                        <Grid container item xs={12}>
                            <Grid item xs={12}>
                                <DefaultContainer className={'playgroundView'}>
                                    <div className={'sectionTitle'}>{t('chooseTesterId')}</div>
                                    <Grid container spacing={3} className={'requestType'}>
                                        <Grid item xs={4} sm={4}>
                                            <Grid item xs={6}>
                                                <TextFieldWrapper
                                                    name="testerId"
                                                    type="text"
                                                    label={t('testerId')}
                                                    value={form.testerId}
                                                    onChange={handleChange}
                                                    customError={_validateTesterId}
                                                    required
                                                />
                                            </Grid>
                                        </Grid>
                                    </Grid>
                                    <div className={'sectionTitle'}>{t('requestType')}</div>
                                    <Grid container spacing={3} className={'requestType'}>
                                        {authTypes.map((key) => (
                                            <Grid key={key} item xs={6} md={4}>
                                                <BoxSelect
                                                    onChange={handleClick}
                                                    name={'requestType'}
                                                    value={key}
                                                    checked={form['requestType'] === key}>
                                                    {t(key)}
                                                </BoxSelect>
                                            </Grid>
                                        ))}
                                        {vrpEnabledTesterId.includes(form.testerId.toLowerCase()) &&
                                            publicRuntimeConfig.tokenEnv === 'dev' && (
                                            <Grid item xs={6} md={4}>
                                                <BoxSelect
                                                    onChange={handleClick}
                                                    name={'requestType'}
                                                    value={vrp}
                                                    checked={form['requestType'] === vrp}>
                                                    {t(vrp)}
                                                </BoxSelect>
                                            </Grid>
                                        )}
                                    </Grid>
                                </DefaultContainer>
                                {form['requestType'] === 'variableRecurringPayment' &&
                                    vrpEnabledTesterId.includes(form.testerId.toLowerCase()) && (
                                    <Grid>
                                        <DefaultContainer className={'playgroundView'}>
                                            <Tabs
                                                value={vrpTabValue}
                                                onChange={handleVrpTabChange}>
                                                {Object.keys(vrpTabs).map((key) => (
                                                    <Tab key={key} label={t(key)} value={key} />
                                                ))}
                                            </Tabs>
                                        </DefaultContainer>
                                        <ActiveTab />
                                    </Grid>
                                )}
                                <DefaultContainer>
                                    <FormWrapper
                                        formRef={ref}
                                        isValid={isFormValid}
                                        onSubmit={Function.prototype}>
                                        {form.requestType !== 'variableRecurringPayment' && (
                                            <div className={'sectionTitle'}>{t('parameters')}</div>
                                        )}
                                        {form['requestType'] === 'accountServices' && (
                                            <Grid
                                                container
                                                alignContent="flex-start"
                                                className="checkboxGroup"
                                                spacing={3}>
                                                {dataParams.map((key) => (
                                                    <Grid item xs={6} md={4} lg={4} key={key}>
                                                        <FormControlLabel
                                                            control={
                                                                <Checkbox
                                                                    onChange={handleCheck}
                                                                    name={key}
                                                                    checked={!!form[key]}
                                                                />
                                                            }
                                                            label={t(key)}
                                                        />
                                                    </Grid>
                                                ))}
                                            </Grid>
                                        )}
                                        <div className={'sectionParameters'}>
                                            {_renderFields(form.requestType)}
                                            <br />
                                            <Grid container spacing={4}>
                                                <Grid item xs={6}>
                                                    <TextFieldWrapper
                                                        name="devKey"
                                                        type="text"
                                                        label={t('devKey')}
                                                        value={form.devKey}
                                                        onChange={handleChange}
                                                    />
                                                </Grid>
                                            </Grid>
                                        </div>
                                        {form.requestType !== 'variableRecurringPayment' && (
                                            <>
                                                <div className={'sectionTitle'}>
                                                    {t('findYourBank')}
                                                </div>
                                                <div className={'sectionParameters'}>
                                                    <Grid container spacing={4}>
                                                        <Grid item xs={6}>
                                                            <SelectWrapper
                                                                name="country"
                                                                label={t('country')}
                                                                value={form.country}
                                                                onChange={handleCountryChange}
                                                                disabled={
                                                                    form.currency !== 'EUR' ||
                                                                    !isTesterIdWhiteListed(
                                                                        form.testerId,
                                                                    )
                                                                }
                                                                required>
                                                                {countries.map((s) => (
                                                                    <MenuItem
                                                                        key={s.code}
                                                                        value={s.code}>
                                                                        {s.name}
                                                                    </MenuItem>
                                                                ))}
                                                            </SelectWrapper>
                                                        </Grid>
                                                        <Grid item xs={6}>
                                                            <Autocomplete
                                                                id="bankId"
                                                                name="bankId"
                                                                options={banks}
                                                                value={selectedBank}
                                                                disabled={!form.country}
                                                                getOptionLabel={(option) =>
                                                                    option.identifier
                                                                        ? `${option.name}-${option.identifier}`
                                                                        : option.name
                                                                }
                                                                onChange={handleAutocomplete}
                                                                onInputChange={getFilteredBanks}
                                                                renderInput={(params) => (
                                                                    <TextField
                                                                        {...params}
                                                                        name={'bankName'}
                                                                        label={t('enterBankName')}
                                                                    />
                                                                )}
                                                                required
                                                            />
                                                        </Grid>
                                                    </Grid>
                                                </div>
                                            </>
                                        )}
                                        {form.requestType === 'singlePayment' && (
                                            <>
                                                <div className={'sectionTitle'}>
                                                    {t('payeeDetails')}
                                                </div>
                                                <div className={'sectionParameters'}>
                                                    {_renderBeneficiaryDetails(
                                                        form.transferDestination,
                                                    )}
                                                </div>
                                            </>
                                        )}
                                        {form.requestType === 'accountServices' &&
                                            selectedBank?.mandatoryFields?.access && (
                                            <>
                                                <div className={'sectionTitle'}>
                                                    {t('payeeDetails')}
                                                </div>
                                                <div className={'sectionParameters'}>
                                                    {_renderAISMandatoryFields()}
                                                </div>
                                            </>
                                        )}
                                        {selectedBank?.credentialFields &&
                                            form.requestType !== 'variableRecurringPayment' &&
                                            !form.webAppEnabled &&
                                            !form.useWebappCredentialsFlow &&
                                            _renderCredentialFields()}
                                        {!isCrowdSource &&
                                            form.requestType !== 'variableRecurringPayment' && (
                                            <Grid item xs={6}>
                                                <TextFieldWrapper
                                                    name="customizationId"
                                                    type="text"
                                                    label={t('customizationId')}
                                                    value={form.customizationId}
                                                    onChange={handleChange}
                                                />
                                            </Grid>
                                        )}
                                        <Grid item xs={12}>
                                            {form.testerId.toLowerCase().includes('callback') &&
                                                form.requestType !== 'variableRecurringPayment' && (
                                                <Grid
                                                    container
                                                    alignContent="flex-start"
                                                    className="checkboxGroup useCredentialFlow"
                                                    spacing={3}>
                                                    <Grid
                                                        item
                                                        xs={6}
                                                        md={4}
                                                        key={'useCredentialFlow'}>
                                                        <FormControlLabel
                                                            control={
                                                                <Checkbox
                                                                    onChange={handleCheck}
                                                                    className={
                                                                        'setCredentialFlow'
                                                                    }
                                                                    name={'useCredentialFlow'}
                                                                    checked={
                                                                        form.useCredentialFlow
                                                                    }
                                                                />
                                                            }
                                                            label={t('useCredentialFlow')}
                                                        />
                                                    </Grid>
                                                    <Grid
                                                        item
                                                        xs={6}
                                                        md={4}
                                                        key={'useWebappCredentialsFlow'}>
                                                        <FormControlLabel
                                                            control={
                                                                <Checkbox
                                                                    onChange={handleCheck}
                                                                    className={
                                                                        'setWebappCredentialsFlow'
                                                                    }
                                                                    name={
                                                                        'useWebappCredentialsFlow'
                                                                    }
                                                                    checked={
                                                                        form.useWebappCredentialsFlow
                                                                    }
                                                                />
                                                            }
                                                            label={t(
                                                                'useWebappCredentialsFlow',
                                                            )}
                                                        />
                                                    </Grid>
                                                </Grid>
                                            )}
                                        </Grid>
                                        <Grid item xs={12}>
                                            {form.requestType === 'singlePayment' &&
                                                selectedBank?.operationalTime && (
                                                <Grid
                                                    container
                                                    alignContent="flex-start"
                                                    className="checkboxGroup disableFutureDatedPaymentConversion"
                                                    spacing={3}>
                                                    <Grid
                                                        item
                                                        xs={6}
                                                        md={4}
                                                        key={
                                                            'disableFutureDatedPaymentConversion'
                                                        }>
                                                        <FormControlLabel
                                                            control={
                                                                <Checkbox
                                                                    onChange={handleCheck}
                                                                    className={
                                                                        'disableFutureDatedPaymentConversion'
                                                                    }
                                                                    name={
                                                                        'disableFutureDatedPaymentConversion'
                                                                    }
                                                                    checked={
                                                                        form.disableFutureDatedPaymentConversion ===
                                                                            false
                                                                    }
                                                                />
                                                            }
                                                            label={t(
                                                                'disableFutureDatedPaymentConversion',
                                                            )}
                                                        />
                                                    </Grid>
                                                </Grid>
                                            )}
                                        </Grid>
                                        {form.requestType !== 'variableRecurringPayment' && (
                                            <div className={'sectionTest'}>
                                                <Grid container spacing={4}>
                                                    <Grid item xs={6} sm={9} />
                                                    <Grid item xs={6} sm={3}>
                                                        <TokenEnablerButton
                                                            disabled={!isFormValid}
                                                            isMobile={isMobile}
                                                            env={env}
                                                        />
                                                    </Grid>
                                                </Grid>
                                            </div>
                                        )}
                                    </FormWrapper>
                                </DefaultContainer>
                            </Grid>
                        </Grid>
                    </Grid>
                </>
                <CustomThemeProvider alt>
                    <SupportTicketModal
                        AppStore={AppStore}
                        SupportTicketModalStore={PlaygroundStore.SupportTicketModalStore}
                    />
                    <GenericErrorModal Store={PlaygroundStore.GenericErrorStore} />
                    <GenericSuccessModal
                        className={'playgroundSuccessModal'}
                        Store={PlaygroundStore.GenericSuccessStore}
                        title={t('modalTitle')}
                        link={supportTicketLink}
                        buttonText={t('modalButton')}
                        icon={successIcon}
                    />
                </CustomThemeProvider>
            </div>
        </>
    );
}

PlaygroundV1.propTypes = {
    PlaygroundStore: PropTypes.object.isRequired,
    AppStore: PropTypes.object.isRequired,
    isMobile: PropTypes.bool,
};

export default inject('PlaygroundStore', 'AppStore')(observer(PlaygroundV1));
