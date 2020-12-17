var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/* eslint-disable no-template-curly-in-string */
import { DI, Protocol, Metadata, ILogger, IServiceLocator } from '@aurelia/kernel';
import { IExpressionParser, PrimitiveLiteralExpression, Scope, } from '@aurelia/runtime';
import { RequiredRule, RegexRule, LengthRule, SizeRule, RangeRule, EqualsRule, IValidationMessageProvider, ValidationRuleAliasMessage, BaseValidationRule, } from './rules.js';
import { IValidationExpressionHydrator, } from './rule-interfaces.js';
/* @internal */
export const ICustomMessages = DI.createInterface('ICustomMessages');
export class RuleProperty {
    constructor(expression, name = void 0, displayName = void 0) {
        this.expression = expression;
        this.name = name;
        this.displayName = displayName;
    }
    accept(visitor) {
        return visitor.visitRuleProperty(this);
    }
}
RuleProperty.$TYPE = 'RuleProperty';
export const validationRulesRegistrar = Object.freeze({
    name: 'validation-rules',
    defaultRuleSetName: '__default',
    set(target, rules, tag) {
        const key = `${validationRulesRegistrar.name}:${tag !== null && tag !== void 0 ? tag : validationRulesRegistrar.defaultRuleSetName}`;
        Metadata.define(Protocol.annotation.keyFor(key), rules, target);
        const keys = Metadata.getOwn(Protocol.annotation.name, target);
        if (keys === void 0) {
            Metadata.define(Protocol.annotation.name, [key], target);
        }
        else {
            keys.push(key);
        }
    },
    get(target, tag) {
        var _a;
        const key = Protocol.annotation.keyFor(validationRulesRegistrar.name, tag !== null && tag !== void 0 ? tag : validationRulesRegistrar.defaultRuleSetName);
        return (_a = Metadata.get(key, target)) !== null && _a !== void 0 ? _a : Metadata.getOwn(key, target.constructor);
    },
    unset(target, tag) {
        const keys = Metadata.getOwn(Protocol.annotation.name, target);
        for (const key of keys.slice(0)) {
            if (key.startsWith(validationRulesRegistrar.name) && (tag === void 0 || key.endsWith(tag))) {
                Metadata.delete(Protocol.annotation.keyFor(key), target);
                const index = keys.indexOf(key);
                if (index > -1) {
                    keys.splice(index, 1);
                }
            }
        }
    },
    isValidationRulesSet(target) {
        const keys = Metadata.getOwn(Protocol.annotation.name, target);
        return keys !== void 0 && keys.some((key) => key.startsWith(validationRulesRegistrar.name));
    }
});
class ValidationMessageEvaluationContext {
    constructor(messageProvider, $displayName, $propertyName, $value, $rule, $object) {
        this.messageProvider = messageProvider;
        this.$displayName = $displayName;
        this.$propertyName = $propertyName;
        this.$value = $value;
        this.$rule = $rule;
        this.$object = $object;
    }
    $getDisplayName(propertyName, displayName) {
        return this.messageProvider.getDisplayName(propertyName, displayName);
    }
}
export class PropertyRule {
    constructor(locator, validationRules, messageProvider, property, $rules = [[]]) {
        this.locator = locator;
        this.validationRules = validationRules;
        this.messageProvider = messageProvider;
        this.property = property;
        this.$rules = $rules;
    }
    accept(visitor) {
        return visitor.visitPropertyRule(this);
    }
    /** @internal */
    addRule(rule) {
        const rules = this.getLeafRules();
        rules.push(this.latestRule = rule);
        return this;
    }
    getLeafRules() {
        const depth = this.$rules.length - 1;
        return this.$rules[depth];
    }
    async validate(object, tag, flags, scope) {
        if (flags === void 0) {
            flags = 0 /* none */;
        }
        if (scope === void 0) {
            scope = Scope.create({ [rootObjectSymbol]: object });
        }
        const expression = this.property.expression;
        let value;
        if (expression === void 0) {
            value = object;
        }
        else {
            value = expression.evaluate(flags, scope, null, this.locator, null); // TODO: get proper hostScope?
        }
        let isValid = true;
        const validateRuleset = async (rules) => {
            const validateRule = async (rule) => {
                let isValidOrPromise = rule.execute(value, object);
                if (isValidOrPromise instanceof Promise) {
                    isValidOrPromise = await isValidOrPromise;
                }
                isValid = isValid && isValidOrPromise;
                const { displayName, name } = this.property;
                let message;
                if (!isValidOrPromise) {
                    const messageEvaluationScope = Scope.create(new ValidationMessageEvaluationContext(this.messageProvider, this.messageProvider.getDisplayName(name, displayName), name, value, rule, object));
                    message = this.messageProvider.getMessage(rule).evaluate(flags, messageEvaluationScope, null, null, null);
                }
                return new ValidationResult(isValidOrPromise, message, name, object, rule, this);
            };
            const promises = [];
            for (const rule of rules) {
                if (rule.canExecute(object) && (tag === void 0 || rule.tag === tag)) {
                    promises.push(validateRule(rule));
                }
            }
            return Promise.all(promises);
        };
        const accumulateResult = async (results, rules) => {
            const result = await validateRuleset(rules);
            results.push(...result);
            return results;
        };
        return this.$rules.reduce(async (acc, ruleset) => acc.then(async (accValidateResult) => isValid ? accumulateResult(accValidateResult, ruleset) : Promise.resolve(accValidateResult)), Promise.resolve([]));
    }
    // #region customization API
    /**
     * Validate subsequent rules after previously declared rules have been validated successfully.
     * Use to postpone validation of costly rules until less expensive rules pass validation.
     */
    then() {
        this.$rules.push([]);
        return this;
    }
    /**
     * Specifies the key to use when looking up the rule's validation message.
     * Note that custom keys needs to be registered during plugin registration.
     */
    withMessageKey(key) {
        this.assertLatestRule(this.latestRule);
        this.latestRule.messageKey = key;
        return this;
    }
    /**
     * Specifies rule's validation message; this overrides the rules default validation message.
     */
    withMessage(message) {
        const rule = this.latestRule;
        this.assertLatestRule(rule);
        this.messageProvider.setMessage(rule, message);
        return this;
    }
    /**
     * Specifies a condition that must be met before attempting to validate the rule.
     *
     * @param {ValidationRuleExecutionPredicate<TObject>} condition - A function that accepts the object as a parameter and returns true or false whether the rule should be evaluated.
     */
    when(condition) {
        this.assertLatestRule(this.latestRule);
        this.latestRule.canExecute = condition;
        return this;
    }
    /**
     * Tags the rule instance.
     * The tag can later be used to perform selective validation.
     */
    tag(tag) {
        this.assertLatestRule(this.latestRule);
        this.latestRule.tag = tag;
        return this;
    }
    assertLatestRule(latestRule) {
        if (latestRule === void 0) {
            throw new Error('No rule has been added'); // TODO: use reporter
        }
    }
    // #endregion
    // #region rule helper API
    /**
     * Sets the display name of the ensured property.
     */
    displayName(name) {
        this.property.displayName = name;
        return this;
    }
    /**
     * Applies an ad-hoc rule function to the ensured property or object.
     *
     * @param {RuleCondition} condition - The function to validate the rule. Will be called with two arguments, the property value and the object.
     */
    satisfies(condition) {
        const rule = new (class extends BaseValidationRule {
            constructor() {
                super(...arguments);
                this.execute = condition;
            }
        })();
        return this.addRule(rule);
    }
    /**
     * Applies a custom rule instance.
     *
     * @param {TRule} validationRule - rule instance.
     */
    satisfiesRule(validationRule) {
        return this.addRule(validationRule);
    }
    /**
     * Applies an instance of `RequiredRule`.
     */
    required() {
        return this.addRule(new RequiredRule());
    }
    /**
     * Applies an instance of `RegexRule`.
     */
    matches(regex) {
        return this.addRule(new RegexRule(regex));
    }
    /**
     * Applies an instance of `RegexRule` with email pattern.
     */
    email() {
        // eslint-disable-next-line no-useless-escape
        const emailPattern = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        return this.addRule(new RegexRule(emailPattern, 'email'));
    }
    /**
     * Applies an instance of `LengthRule` with min `length` constraint.
     * Applicable for string value.
     */
    minLength(length) {
        return this.addRule(new LengthRule(length, false));
    }
    /**
     * Applies an instance of `LengthRule` with max `length` constraint.
     * Applicable for string value.
     */
    maxLength(length) {
        return this.addRule(new LengthRule(length, true));
    }
    /**
     * Applies an instance of `SizeRule` with min `count` constraint.
     * Applicable for array value.
     */
    minItems(count) {
        return this.addRule(new SizeRule(count, false));
    }
    /**
     * Applies an instance of `SizeRule` with max `count` constraint.
     * Applicable for array value.
     */
    maxItems(count) {
        return this.addRule(new SizeRule(count, true));
    }
    /**
     * Applies an instance of `RangeRule` with [`constraint`,] interval.
     * Applicable for number value.
     */
    min(constraint) {
        return this.addRule(new RangeRule(true, { min: constraint }));
    }
    /**
     * Applies an instance of `RangeRule` with [,`constraint`] interval.
     * Applicable for number value.
     */
    max(constraint) {
        return this.addRule(new RangeRule(true, { max: constraint }));
    }
    /**
     * Applies an instance of `RangeRule` with [`min`,`max`] interval.
     * Applicable for number value.
     */
    range(min, max) {
        return this.addRule(new RangeRule(true, { min, max }));
    }
    /**
     * Applies an instance of `RangeRule` with (`min`,`max`) interval.
     * Applicable for number value.
     */
    between(min, max) {
        return this.addRule(new RangeRule(false, { min, max }));
    }
    /**
     * Applies an instance of `EqualsRule` with the `expectedValue`.
     */
    equals(expectedValue) {
        return this.addRule(new EqualsRule(expectedValue));
    }
    ensure(property) {
        this.latestRule = void 0;
        return this.validationRules.ensure(property);
    }
    /**
     * Targets an object with validation rules.
     */
    ensureObject() {
        this.latestRule = void 0;
        return this.validationRules.ensureObject();
    }
    /**
     * Rules that have been defined using the fluent API.
     */
    get rules() {
        return this.validationRules.rules;
    }
    on(target, tag) {
        return this.validationRules.on(target, tag);
    }
}
PropertyRule.$TYPE = 'PropertyRule';
export class ModelBasedRule {
    constructor(ruleset, tag = validationRulesRegistrar.defaultRuleSetName) {
        this.ruleset = ruleset;
        this.tag = tag;
    }
}
export const IValidationRules = DI.createInterface('IValidationRules');
let ValidationRules = class ValidationRules {
    constructor(locator, parser, messageProvider, deserializer) {
        this.locator = locator;
        this.parser = parser;
        this.messageProvider = messageProvider;
        this.deserializer = deserializer;
        this.rules = [];
        this.targets = new Set();
    }
    ensure(property) {
        const [name, expression] = parsePropertyName(property, this.parser);
        // eslint-disable-next-line eqeqeq
        let rule = this.rules.find((r) => r.property.name == name);
        if (rule === void 0) {
            rule = new PropertyRule(this.locator, this, this.messageProvider, new RuleProperty(expression, name));
            this.rules.push(rule);
        }
        return rule;
    }
    ensureObject() {
        const rule = new PropertyRule(this.locator, this, this.messageProvider, new RuleProperty());
        this.rules.push(rule);
        return rule;
    }
    on(target, tag) {
        const rules = validationRulesRegistrar.get(target, tag);
        if (Object.is(rules, this.rules)) {
            return this;
        }
        this.rules = rules !== null && rules !== void 0 ? rules : [];
        validationRulesRegistrar.set(target, this.rules, tag);
        this.targets.add(target);
        return this;
    }
    off(target, tag) {
        const $targets = target !== void 0 ? [target] : Array.from(this.targets);
        for (const $target of $targets) {
            validationRulesRegistrar.unset($target, tag);
            if (!validationRulesRegistrar.isValidationRulesSet($target)) {
                this.targets.delete($target);
            }
        }
    }
    applyModelBasedRules(target, rules) {
        const tags = new Set();
        for (const rule of rules) {
            const tag = rule.tag;
            if (tags.has(tag)) {
                console.warn(`A ruleset for tag ${tag} is already defined which will be overwritten`); // TODO: use reporter/logger
            }
            const ruleset = this.deserializer.hydrateRuleset(rule.ruleset, this);
            validationRulesRegistrar.set(target, ruleset, tag);
            tags.add(tag);
        }
    }
};
ValidationRules = __decorate([
    __param(0, IServiceLocator),
    __param(1, IExpressionParser),
    __param(2, IValidationMessageProvider),
    __param(3, IValidationExpressionHydrator)
], ValidationRules);
export { ValidationRules };
// eslint-disable-next-line no-useless-escape
const classicAccessorPattern = /^function\s*\([$_\w\d]+\)\s*\{(?:\s*["']{1}use strict["']{1};)?(?:[$_\s\w\d\/\*.['"\]+;]+)?\s*return\s+[$_\w\d]+((\.[$_\w\d]+|\[['"$_\w\d]+\])+)\s*;?\s*\}$/;
const arrowAccessorPattern = /^\(?[$_\w\d]+\)?\s*=>\s*[$_\w\d]+((\.[$_\w\d]+|\[['"$_\w\d]+\])+)$/;
export const rootObjectSymbol = '$root';
export function parsePropertyName(property, parser) {
    var _a;
    switch (typeof property) {
        case 'string':
            break;
        case 'function': {
            const fn = property.toString();
            const match = (_a = arrowAccessorPattern.exec(fn)) !== null && _a !== void 0 ? _a : classicAccessorPattern.exec(fn);
            if (match === null) {
                throw new Error(`Unable to parse accessor function:\n${fn}`); // TODO: use reporter
            }
            property = match[1].substring(1);
            break;
        }
        default:
            throw new Error(`Unable to parse accessor function:\n${property}`); // TODO: use reporter
    }
    return [property, parser.parse(`${rootObjectSymbol}.${property}`, 53 /* BindCommand */)];
}
/**
 * The result of validating an individual validation rule.
 */
export class ValidationResult {
    /**
     * @param {boolean} valid - `true` is the validation was successful, else `false`.
     * @param {(string | undefined)} message - Evaluated validation message, if the result is not valid, else `undefined`.
     * @param {(string | number | undefined)} propertyName - Associated property name.
     * @param {(IValidateable | undefined)} object - Associated target object.
     * @param {(TRule | undefined)} rule - Associated instance of rule.
     * @param {(PropertyRule | undefined)} propertyRule - Associated parent property rule.
     * @param {boolean} [isManual=false] - `true` if the validation result is added manually.
     */
    constructor(valid, message, propertyName, object, rule, propertyRule, isManual = false) {
        this.valid = valid;
        this.message = message;
        this.propertyName = propertyName;
        this.object = object;
        this.rule = rule;
        this.propertyRule = propertyRule;
        this.isManual = isManual;
        this.id = ValidationResult.nextId++;
    }
    toString() {
        return this.valid ? 'Valid.' : this.message;
    }
}
ValidationResult.nextId = 0;
const contextualProperties = new Set([
    'displayName',
    'propertyName',
    'value',
    'object',
    'config',
    'getDisplayName'
]);
let ValidationMessageProvider = class ValidationMessageProvider {
    constructor(parser, logger, customMessages) {
        this.parser = parser;
        this.registeredMessages = new WeakMap();
        this.logger = logger.scopeTo(ValidationMessageProvider.name);
        for (const { rule, aliases } of customMessages) {
            ValidationRuleAliasMessage.setDefaultMessage(rule, { aliases });
        }
    }
    getMessage(rule) {
        var _a;
        const parsedMessage = this.registeredMessages.get(rule);
        if (parsedMessage !== void 0) {
            return parsedMessage;
        }
        const validationMessages = ValidationRuleAliasMessage.getDefaultMessages(rule);
        const messageKey = rule.messageKey;
        let message;
        const messageCount = validationMessages.length;
        if (messageCount === 1 && messageKey === void 0) {
            message = validationMessages[0].defaultMessage;
        }
        else {
            message = (_a = validationMessages.find(m => m.name === messageKey)) === null || _a === void 0 ? void 0 : _a.defaultMessage;
        }
        if (!message) {
            message = ValidationRuleAliasMessage.getDefaultMessages(BaseValidationRule)[0].defaultMessage;
        }
        return this.setMessage(rule, message);
    }
    setMessage(rule, message) {
        const parsedMessage = this.parseMessage(message);
        this.registeredMessages.set(rule, parsedMessage);
        return parsedMessage;
    }
    parseMessage(message) {
        const parsed = this.parser.parse(message, 2048 /* Interpolation */);
        if ((parsed === null || parsed === void 0 ? void 0 : parsed.$kind) === 24 /* Interpolation */) {
            for (const expr of parsed.expressions) {
                const name = expr.name;
                if (contextualProperties.has(name)) {
                    this.logger.warn(`Did you mean to use "$${name}" instead of "${name}" in this validation message template: "${message}"?`);
                }
                if (expr.$kind === 1793 /* AccessThis */ || expr.ancestor > 0) {
                    throw new Error('$parent is not permitted in validation message expressions.'); // TODO: use reporter
                }
            }
            return parsed;
        }
        return new PrimitiveLiteralExpression(message);
    }
    getDisplayName(propertyName, displayName) {
        if (displayName !== null && displayName !== undefined) {
            return (displayName instanceof Function) ? displayName() : displayName;
        }
        if (propertyName === void 0) {
            return;
        }
        // split on upper-case letters.
        const words = propertyName.toString().split(/(?=[A-Z])/).join(' ');
        // capitalize first letter.
        return words.charAt(0).toUpperCase() + words.slice(1);
    }
};
ValidationMessageProvider = __decorate([
    __param(0, IExpressionParser),
    __param(1, ILogger),
    __param(2, ICustomMessages)
], ValidationMessageProvider);
export { ValidationMessageProvider };
//# sourceMappingURL=rule-provider.js.map