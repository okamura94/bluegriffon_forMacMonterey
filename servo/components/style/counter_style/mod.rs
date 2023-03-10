/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

//! The [`@counter-style`][counter-style] at-rule.
//!
//! [counter-style]: https://drafts.csswg.org/css-counter-styles/

use Atom;
use cssparser::{AtRuleParser, DeclarationListParser, DeclarationParser, Parser, Token};
use cssparser::{serialize_string, serialize_identifier};
#[cfg(feature = "gecko")] use gecko::rules::CounterStyleDescriptors;
#[cfg(feature = "gecko")] use gecko_bindings::structs::nsCSSCounterDesc;
use parser::{ParserContext, log_css_error, Parse};
use shared_lock::{SharedRwLockReadGuard, ToCssWithGuard};
use std::ascii::AsciiExt;
use std::borrow::Cow;
use std::fmt;
use std::ops::Range;
use style_traits::{ToCss, OneOrMoreCommaSeparated};
use values::CustomIdent;

/// Parse the prelude of an @counter-style rule
pub fn parse_counter_style_name(input: &mut Parser) -> Result<CustomIdent, ()> {
    macro_rules! predefined {
        ($($name: expr,)+) => {
            {
                ascii_case_insensitive_phf_map! {
                    // FIXME: use static atoms https://github.com/rust-lang/rust/issues/33156
                    predefined -> &'static str = {
                        $(
                            $name => $name,
                        )+
                    }
                }

                let ident = input.expect_ident()?;
                if let Some(&lower_cased) = predefined(&ident) {
                    Ok(CustomIdent(Atom::from(lower_cased)))
                } else {
                    // https://github.com/w3c/csswg-drafts/issues/1295 excludes "none"
                    CustomIdent::from_ident(ident, &["none"])
                }
            }
        }
    }
    include!("predefined.rs")
}

/// Parse the body (inside `{}`) of an @counter-style rule
pub fn parse_counter_style_body(name: CustomIdent, context: &ParserContext, input: &mut Parser)
                            -> Result<CounterStyleRule, ()> {
    let start = input.position();
    let mut rule = CounterStyleRule::empty(name);
    {
        let parser = CounterStyleRuleParser {
            context: context,
            rule: &mut rule,
        };
        let mut iter = DeclarationListParser::new(input, parser);
        while let Some(declaration) = iter.next() {
            if let Err(range) = declaration {
                let pos = range.start;
                let message = format!("Unsupported @counter-style descriptor declaration: '{}'",
                                      iter.input.slice(range));
                log_css_error(iter.input, pos, &*message, context);
            }
        }
    }
    let error = match *rule.system() {
        ref system @ System::Cyclic |
        ref system @ System::Fixed { .. } |
        ref system @ System::Symbolic |
        ref system @ System::Alphabetic |
        ref system @ System::Numeric
        if rule.symbols.is_none() => {
            let system = system.to_css_string();
            Some(format!("Invalid @counter-style rule: 'system: {}' without 'symbols'", system))
        }
        ref system @ System::Alphabetic |
        ref system @ System::Numeric
        if rule.symbols().unwrap().0.len() < 2 => {
            let system = system.to_css_string();
            Some(format!("Invalid @counter-style rule: 'system: {}' less than two 'symbols'",
                         system))
        }
        System::Additive if rule.additive_symbols.is_none() => {
            let s = "Invalid @counter-style rule: 'system: additive' without 'additive-symbols'";
            Some(s.to_owned())
        }
        System::Extends(_) if rule.symbols.is_some() => {
            let s = "Invalid @counter-style rule: 'system: extends ???' with 'symbols'";
            Some(s.to_owned())
        }
        System::Extends(_) if rule.additive_symbols.is_some() => {
            let s = "Invalid @counter-style rule: 'system: extends ???' with 'additive-symbols'";
            Some(s.to_owned())
        }
        _ => None
    };
    if let Some(message) = error {
        log_css_error(input, start, &message, context);
        Err(())
    } else {
        Ok(rule)
    }
}

struct CounterStyleRuleParser<'a, 'b: 'a> {
    context: &'a ParserContext<'b>,
    rule: &'a mut CounterStyleRule,
}

/// Default methods reject all at rules.
impl<'a, 'b> AtRuleParser for CounterStyleRuleParser<'a, 'b> {
    type Prelude = ();
    type AtRule = ();
}

macro_rules! accessor {
    (#[$doc: meta] $name: tt $ident: ident: $ty: ty = !) => {
        #[$doc]
        pub fn $ident(&self) -> Option<&$ty> {
            self.$ident.as_ref()
        }
    };

    (#[$doc: meta] $name: tt $ident: ident: $ty: ty = $initial: expr) => {
        #[$doc]
        pub fn $ident(&self) -> Cow<$ty> {
            if let Some(ref value) = self.$ident {
                Cow::Borrowed(value)
            } else {
                Cow::Owned($initial)
            }
        }
    }
}

macro_rules! counter_style_descriptors {
    (
        $( #[$doc: meta] $name: tt $ident: ident / $gecko_ident: ident: $ty: ty = $initial: tt )+
    ) => {
        /// An @counter-style rule
        #[derive(Debug)]
        pub struct CounterStyleRule {
            name: CustomIdent,
            $(
                #[$doc]
                $ident: Option<$ty>,
            )+
        }

        impl CounterStyleRule {
            fn empty(name: CustomIdent) -> Self {
                CounterStyleRule {
                    name: name,
                    $(
                        $ident: None,
                    )+
                }
            }

            $(
                accessor!(#[$doc] $name $ident: $ty = $initial);
            )+

            /// Convert to Gecko types
            #[cfg(feature = "gecko")]
            pub fn set_descriptors(&self, descriptors: &mut CounterStyleDescriptors) {
                $(
                    if let Some(ref value) = self.$ident {
                        descriptors[nsCSSCounterDesc::$gecko_ident as usize].set_from(value)
                    }
                )*
            }
        }

       impl<'a, 'b> DeclarationParser for CounterStyleRuleParser<'a, 'b> {
            type Declaration = ();

            fn parse_value(&mut self, name: &str, input: &mut Parser) -> Result<(), ()> {
                match_ignore_ascii_case! { name,
                    $(
                        $name => {
                            // DeclarationParser also calls parse_entirely
                            // so we???d normally not need to,
                            // but in this case we do because we set the value as a side effect
                            // rather than returning it.
                            let value = input.parse_entirely(|i| Parse::parse(self.context, i))?;
                            self.rule.$ident = Some(value)
                        }
                    )*
                    _ => return Err(())
                }
                Ok(())
            }
        }

        impl ToCssWithGuard for CounterStyleRule {
            fn to_css<W>(&self, _guard: &SharedRwLockReadGuard, dest: &mut W) -> fmt::Result
            where W: fmt::Write {
                dest.write_str("@counter-style ")?;
                self.name.to_css(dest)?;
                dest.write_str(" {\n")?;
                $(
                    if let Some(ref value) = self.$ident {
                        dest.write_str(concat!("  ", $name, ": "))?;
                        ToCss::to_css(value, dest)?;
                        dest.write_str(";\n")?;
                    }
                )+
                dest.write_str("}")
            }
        }
    }
}

counter_style_descriptors! {
    /// https://drafts.csswg.org/css-counter-styles/#counter-style-system
    "system" system / eCSSCounterDesc_System: System = {
        System::Symbolic
    }

    /// https://drafts.csswg.org/css-counter-styles/#counter-style-negative
    "negative" negative / eCSSCounterDesc_Negative: Negative = {
        Negative(Symbol::String("-".to_owned()), None)
    }

    /// https://drafts.csswg.org/css-counter-styles/#counter-style-prefix
    "prefix" prefix / eCSSCounterDesc_Prefix: Symbol = {
        Symbol::String("".to_owned())
    }

    /// https://drafts.csswg.org/css-counter-styles/#counter-style-suffix
    "suffix" suffix / eCSSCounterDesc_Suffix: Symbol = {
        Symbol::String(". ".to_owned())
    }

    /// https://drafts.csswg.org/css-counter-styles/#counter-style-range
    "range" range / eCSSCounterDesc_Range: Ranges = {
        Ranges(Vec::new())  // Empty Vec represents 'auto'
    }

    /// https://drafts.csswg.org/css-counter-styles/#counter-style-pad
    "pad" pad / eCSSCounterDesc_Pad: Pad = {
        Pad(0, Symbol::String("".to_owned()))
    }

    /// https://drafts.csswg.org/css-counter-styles/#counter-style-fallback
    "fallback" fallback / eCSSCounterDesc_Fallback: Fallback = {
        // FIXME https://bugzilla.mozilla.org/show_bug.cgi?id=1359323 use atom!()
        Fallback(CustomIdent(Atom::from("decimal")))
    }

    /// https://drafts.csswg.org/css-counter-styles/#descdef-counter-style-symbols
    "symbols" symbols / eCSSCounterDesc_Symbols: Symbols = !

    /// https://drafts.csswg.org/css-counter-styles/#descdef-counter-style-additive-symbols
    "additive-symbols" additive_symbols / eCSSCounterDesc_AdditiveSymbols: AdditiveSymbols = !

    /// https://drafts.csswg.org/css-counter-styles/#counter-style-speak-as
    "speak-as" speak_as / eCSSCounterDesc_SpeakAs: SpeakAs = {
        SpeakAs::Auto
    }
}

/// https://drafts.csswg.org/css-counter-styles/#counter-style-system
#[derive(Debug, Clone)]
pub enum System {
    /// 'cyclic'
    Cyclic,
    /// 'numeric'
    Numeric,
    /// 'alphabetic'
    Alphabetic,
    /// 'symbolic'
    Symbolic,
    /// 'additive'
    Additive,
    /// 'fixed <integer>?'
    Fixed {
        /// '<integer>?'
        first_symbol_value: Option<i32>
    },
    /// 'extends <counter-style-name>'
    Extends(CustomIdent),
}

impl Parse for System {
    fn parse(_context: &ParserContext, input: &mut Parser) -> Result<Self, ()> {
        match_ignore_ascii_case! { &input.expect_ident()?,
            "cyclic" => Ok(System::Cyclic),
            "numeric" => Ok(System::Numeric),
            "alphabetic" => Ok(System::Alphabetic),
            "symbolic" => Ok(System::Symbolic),
            "additive" => Ok(System::Additive),
            "fixed" => {
                let first_symbol_value = input.try(|i| i.expect_integer()).ok();
                Ok(System::Fixed { first_symbol_value: first_symbol_value })
            }
            "extends" => {
                let other = parse_counter_style_name(input)?;
                Ok(System::Extends(other))
            }
            _ => Err(())
        }
    }
}

impl ToCss for System {
    fn to_css<W>(&self, dest: &mut W) -> fmt::Result where W: fmt::Write {
        match *self {
            System::Cyclic => dest.write_str("cyclic"),
            System::Numeric => dest.write_str("numeric"),
            System::Alphabetic => dest.write_str("alphabetic"),
            System::Symbolic => dest.write_str("symbolic"),
            System::Additive => dest.write_str("additive"),
            System::Fixed { first_symbol_value } => {
                if let Some(value) = first_symbol_value {
                    write!(dest, "fixed {}", value)
                } else {
                    dest.write_str("fixed")
                }
            }
            System::Extends(ref other) => {
                dest.write_str("extends ")?;
                other.to_css(dest)
            }
        }
    }
}

/// https://drafts.csswg.org/css-counter-styles/#typedef-symbol
#[derive(Debug, Clone)]
pub enum Symbol {
    /// <string>
    String(String),
    /// <ident>
    Ident(String),
    // Not implemented:
    // /// <image>
    // Image(Image),
}

impl Parse for Symbol {
    fn parse(_context: &ParserContext, input: &mut Parser) -> Result<Self, ()> {
        match input.next() {
            Ok(Token::QuotedString(s)) => Ok(Symbol::String(s.into_owned())),
            Ok(Token::Ident(s)) => Ok(Symbol::Ident(s.into_owned())),
            _ => Err(())
        }
    }
}

impl ToCss for Symbol {
    fn to_css<W>(&self, dest: &mut W) -> fmt::Result where W: fmt::Write {
        match *self {
            Symbol::String(ref s) => serialize_string(s, dest),
            Symbol::Ident(ref s) => serialize_identifier(s, dest),
        }
    }
}

/// https://drafts.csswg.org/css-counter-styles/#counter-style-negative
#[derive(Debug, Clone)]
pub struct Negative(pub Symbol, pub Option<Symbol>);

impl Parse for Negative {
    fn parse(context: &ParserContext, input: &mut Parser) -> Result<Self, ()> {
        Ok(Negative(
            Symbol::parse(context, input)?,
            input.try(|input| Symbol::parse(context, input)).ok(),
        ))
    }
}

impl ToCss for Negative {
    fn to_css<W>(&self, dest: &mut W) -> fmt::Result where W: fmt::Write {
        self.0.to_css(dest)?;
        if let Some(ref symbol) = self.1 {
            dest.write_char(' ')?;
            symbol.to_css(dest)?
        }
        Ok(())
    }
}

/// https://drafts.csswg.org/css-counter-styles/#counter-style-range
///
/// Empty Vec represents 'auto'
#[derive(Debug, Clone)]
pub struct Ranges(pub Vec<Range<Option<i32>>>);

impl Parse for Ranges {
    fn parse(_context: &ParserContext, input: &mut Parser) -> Result<Self, ()> {
        if input.try(|input| input.expect_ident_matching("auto")).is_ok() {
            Ok(Ranges(Vec::new()))
        } else {
            input.parse_comma_separated(|input| {
                let opt_start = parse_bound(input)?;
                let opt_end = parse_bound(input)?;
                if let (Some(start), Some(end)) = (opt_start, opt_end) {
                    if start > end {
                        return Err(())
                    }
                }
                Ok(opt_start..opt_end)
            }).map(Ranges)
        }
    }
}

fn parse_bound(input: &mut Parser) -> Result<Option<i32>, ()> {
    match input.next() {
        Ok(Token::Number(ref v)) if v.int_value.is_some() => Ok(Some(v.int_value.unwrap())),
        Ok(Token::Ident(ref ident)) if ident.eq_ignore_ascii_case("infinite") => Ok(None),
        _ => Err(())
    }
}

impl ToCss for Ranges {
    fn to_css<W>(&self, dest: &mut W) -> fmt::Result where W: fmt::Write {
        let mut iter = self.0.iter();
        if let Some(first) = iter.next() {
            range_to_css(first, dest)?;
            for item in iter {
                dest.write_str(", ")?;
                range_to_css(item, dest)?;
            }
            Ok(())
        } else {
            dest.write_str("auto")
        }
    }
}

fn range_to_css<W>(range: &Range<Option<i32>>, dest: &mut W) -> fmt::Result
where W: fmt::Write {
    bound_to_css(range.start, dest)?;
    dest.write_char(' ')?;
    bound_to_css(range.end, dest)
}

fn bound_to_css<W>(range: Option<i32>, dest: &mut W) -> fmt::Result where W: fmt::Write {
    if let Some(finite) = range {
        write!(dest, "{}", finite)
    } else {
        dest.write_str("infinite")
    }
}

/// https://drafts.csswg.org/css-counter-styles/#counter-style-pad
#[derive(Debug, Clone)]
pub struct Pad(pub u32, pub Symbol);

impl Parse for Pad {
    fn parse(context: &ParserContext, input: &mut Parser) -> Result<Self, ()> {
        let pad_with = input.try(|input| Symbol::parse(context, input));
        let min_length = input.expect_integer()?;
        if min_length < 0 {
            return Err(())
        }
        let pad_with = pad_with.or_else(|()| Symbol::parse(context, input))?;
        Ok(Pad(min_length as u32, pad_with))
    }
}

impl ToCss for Pad {
    fn to_css<W>(&self, dest: &mut W) -> fmt::Result where W: fmt::Write {
        write!(dest, "{} ", self.0)?;
        self.1.to_css(dest)
    }
}

/// https://drafts.csswg.org/css-counter-styles/#counter-style-fallback
#[derive(Debug, Clone)]
pub struct Fallback(pub CustomIdent);

impl Parse for Fallback {
    fn parse(_context: &ParserContext, input: &mut Parser) -> Result<Self, ()> {
        parse_counter_style_name(input).map(Fallback)
    }
}

impl ToCss for Fallback {
    fn to_css<W>(&self, dest: &mut W) -> fmt::Result where W: fmt::Write {
        self.0.to_css(dest)
    }
}

/// https://drafts.csswg.org/css-counter-styles/#descdef-counter-style-symbols
#[derive(Debug, Clone)]
pub struct Symbols(pub Vec<Symbol>);

impl Parse for Symbols {
    fn parse(context: &ParserContext, input: &mut Parser) -> Result<Self, ()> {
        let mut symbols = Vec::new();
        loop {
            if let Ok(s) = input.try(|input| Symbol::parse(context, input)) {
                symbols.push(s)
            } else {
                if symbols.is_empty() {
                    return Err(())
                } else {
                    return Ok(Symbols(symbols))
                }
            }
        }
    }
}

impl ToCss for Symbols {
    fn to_css<W>(&self, dest: &mut W) -> fmt::Result where W: fmt::Write {
        let mut iter = self.0.iter();
        let first = iter.next().expect("expected at least one symbol");
        first.to_css(dest)?;
        for item in iter {
            dest.write_char(' ')?;
            item.to_css(dest)?;
        }
        Ok(())
    }
}

/// https://drafts.csswg.org/css-counter-styles/#descdef-counter-style-additive-symbols
#[derive(Debug, Clone)]
pub struct AdditiveSymbols(pub Vec<AdditiveTuple>);

impl Parse for AdditiveSymbols {
    fn parse(context: &ParserContext, input: &mut Parser) -> Result<Self, ()> {
        let tuples = Vec::<AdditiveTuple>::parse(context, input)?;
        // FIXME maybe? https://github.com/w3c/csswg-drafts/issues/1220
        if tuples.windows(2).any(|window| window[0].value <= window[1].value) {
            return Err(())
        }
        Ok(AdditiveSymbols(tuples))
    }
}

impl ToCss for AdditiveSymbols {
    fn to_css<W>(&self, dest: &mut W) -> fmt::Result where W: fmt::Write {
        self.0.to_css(dest)
    }
}

/// <integer> && <symbol>
#[derive(Debug, Clone)]
pub struct AdditiveTuple {
    value: u32,
    symbol: Symbol,
}

impl OneOrMoreCommaSeparated for AdditiveTuple {}

impl Parse for AdditiveTuple {
    fn parse(context: &ParserContext, input: &mut Parser) -> Result<Self, ()> {
        let symbol = input.try(|input| Symbol::parse(context, input));
        let value = input.expect_integer()?;
        if value < 0 {
            return Err(())
        }
        let symbol = symbol.or_else(|()| Symbol::parse(context, input))?;
        Ok(AdditiveTuple {
            value: value as u32,
            symbol: symbol,
        })
    }
}

impl ToCss for AdditiveTuple {
    fn to_css<W>(&self, dest: &mut W) -> fmt::Result where W: fmt::Write {
        write!(dest, "{} ", self.value)?;
        self.symbol.to_css(dest)
    }
}

/// https://drafts.csswg.org/css-counter-styles/#counter-style-speak-as
#[derive(Debug, Clone)]
pub enum SpeakAs {
    /// auto
    Auto,
    /// bullets
    Bullets,
    /// numbers
    Numbers,
    /// words
    Words,
    // /// spell-out, not supported, see bug 1024178
    // SpellOut,
    /// <counter-style-name>
    Other(CustomIdent),
}

impl Parse for SpeakAs {
    fn parse(_context: &ParserContext, input: &mut Parser) -> Result<Self, ()> {
        let mut is_spell_out = false;
        let result = input.try(|input| {
            match_ignore_ascii_case! { &input.expect_ident()?,
                "auto" => Ok(SpeakAs::Auto),
                "bullets" => Ok(SpeakAs::Bullets),
                "numbers" => Ok(SpeakAs::Numbers),
                "words" => Ok(SpeakAs::Words),
                "spell-out" => {
                    is_spell_out = true;
                    Err(())
                }
                _ => Err(())
            }
        });
        if is_spell_out {
            // spell-out is not supported, but don???t parse it as a <counter-style-name>.
            // See bug 1024178.
            return Err(())
        }
        result.or_else(|()| {
            Ok(SpeakAs::Other(parse_counter_style_name(input)?))
        })
    }
}

impl ToCss for SpeakAs {
    fn to_css<W>(&self, dest: &mut W) -> fmt::Result where W: fmt::Write {
        match *self {
            SpeakAs::Auto => dest.write_str("auto"),
            SpeakAs::Bullets => dest.write_str("bullets"),
            SpeakAs::Numbers => dest.write_str("numbers"),
            SpeakAs::Words => dest.write_str("words"),
            SpeakAs::Other(ref other) => other.to_css(dest),
        }
    }
}
