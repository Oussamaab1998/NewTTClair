/**
 * A generated line of the method lesson, composed from DATA (MethodNote) with
 * i18n and the cards' own words. No Arabic is hardcoded here, and the only
 * numbers are the student's own line, as he typed it (addendum E, 22, 23).
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import type { Rich } from '../../../content/schema';
import { lineLatex } from '../../../method/lineChain';
import type { MethodNote } from '../../../method/note';
import { theme } from '../../../theme';
import { MathBlock } from '../../math/MathBlock';
import { toPlainText } from '../../rich/runs';
import { RichView } from '../RichView';

const plain = (r: Rich): string =>
  [r.ar ? toPlainText(r.ar) : '', r.fr ?? ''].join(' ').trim();

const nodeLabel = (t: TFunction, id: string): string =>
  t(`method.node.${id}`, { defaultValue: id });

/** What a screen reader says for the note. */
export function noteSpoken(t: TFunction, note: MethodNote): string {
  switch (note.kind) {
    case 'reason_order':
      return [
        t('method.reason.lead'),
        ...note.clauses.map(
          c =>
            `${plain(c.card)} ${t('method.reason.after')} ${c.needs
              .map(plain)
              .join(` ${t('method.reason.and')} `)}${t(
              'method.reason.because',
            )}`,
        ),
        ...(note.clauses.length === 0 ? [t('method.reason.free')] : []),
      ].join(' ');
    case 'recap':
      return `${t('method.recap.found')} ${plain(note.found)}. ${
        note.next
          ? `${t('method.recap.next')} ${plain(note.next)}`
          : t('method.recap.last')
      }`;
    case 'credit':
      return `${t('method.credit.title')} ${t(
        'method.credit.counts',
      )} ${nodeLabel(t, note.nodeId)}`;
    case 'plan_violation':
      return `${plain(note.card)} ${t('method.plan.needs')} ${note.needs
        .map(plain)
        .join(` ${t('method.reason.and')} `)} ${t('method.plan.before')}`;
    case 'neutral':
      return t(`method.neutral.${note.code}`);
    case 'claim_result':
      return note.rows
        .map(
          r =>
            `${t('method.claim.predicted')} ${r.predicted}. ${t(
              'method.claim.actual',
            )} ${r.actual}. ${t(
              r.holds ? 'method.claim.holds' : 'method.claim.fails',
            )}`,
        )
        .join(' ');
    case 'list_help':
      return t(`method.listHelp.${note.level}`);
    case 'recipe':
      return `${t('method.recipe.mine')}: ${note.mine
        .map(plain)
        .join('. ')}. ${t('method.recipe.clean')}: ${note.clean
        .map(plain)
        .join('. ')}`;
    case 'review':
      return reviewLabel(t, note);
    case 'target':
      return `${t('method.target.lead')} ${plain(note.target)}`;
  }
}

const reviewLabel = (
  t: TFunction,
  note: Extract<MethodNote, { kind: 'review' }>,
): string =>
  note.outcome === 'credit'
    ? `${t('method.review.credit')} ${nodeLabel(t, note.nodeId ?? '')}`
    : note.outcome === 'slip'
    ? `${t('method.review.slip')} ${t(`method.mut.${note.id ?? ''}`, {
        defaultValue: t('method.review.slipUnknown'),
      })}`
    : t('method.review.other');

export function MethodNoteView({ note }: { note: MethodNote }) {
  const { t } = useTranslation();
  switch (note.kind) {
    case 'reason_order':
      return (
        <View style={styles.block} testID="note-reason-order">
          <Text style={styles.text}>{t('method.reason.lead')}</Text>
          {note.clauses.length === 0 && (
            <Text style={styles.text}>{t('method.reason.free')}</Text>
          )}
          {note.clauses.map((c, i) => (
            <View key={i} style={styles.clause}>
              <RichView rich={c.card} fontFamily={theme.font.family.ui.bold} />
              <Text style={styles.text}>{t('method.reason.after')}</Text>
              {c.needs.map((n, j) => (
                <React.Fragment key={j}>
                  {j > 0 && (
                    <Text style={styles.text}>{t('method.reason.and')}</Text>
                  )}
                  <RichView rich={n} fontFamily={theme.font.family.ui.bold} />
                </React.Fragment>
              ))}
              <Text style={styles.text}>{t('method.reason.because')}</Text>
            </View>
          ))}
        </View>
      );
    case 'recap':
      return (
        <View style={styles.block} testID="note-recap">
          <View style={styles.clause}>
            <Text style={styles.text}>{t('method.recap.found')}</Text>
            <RichView
              rich={note.found}
              fontFamily={theme.font.family.ui.bold}
            />
          </View>
          {note.line !== undefined && (
            <MathBlock
              latex={lineLatex(note.line)}
              fontSize={theme.font.size.body}
            />
          )}
          {note.next ? (
            <View style={styles.clause}>
              <Text style={styles.text}>{t('method.recap.next')}</Text>
              <RichView
                rich={note.next}
                fontFamily={theme.font.family.ui.bold}
              />
            </View>
          ) : (
            <Text style={styles.text}>{t('method.recap.last')}</Text>
          )}
        </View>
      );
    case 'credit':
      return (
        <View style={styles.block} testID="note-credit">
          <Text style={styles.text}>
            {note.support ? '' : `${t('method.credit.title')} `}
            {t('method.credit.counts')} {nodeLabel(t, note.nodeId)}
          </Text>
          {note.derivation === 'absent' && (
            <Text style={styles.text}>{t('method.credit.unexplained')}</Text>
          )}
          {note.unsimplified && (
            <Text style={styles.text}>{t('method.credit.unsimplified')}</Text>
          )}
        </View>
      );
    case 'plan_violation':
      return (
        <View style={styles.clause} testID="note-plan-violation">
          <RichView rich={note.card} fontFamily={theme.font.family.ui.bold} />
          <Text style={styles.text}>{t('method.plan.needs')}</Text>
          {note.needs.map((n, j) => (
            <React.Fragment key={j}>
              {j > 0 && (
                <Text style={styles.text}>{t('method.reason.and')}</Text>
              )}
              <RichView rich={n} fontFamily={theme.font.family.ui.bold} />
            </React.Fragment>
          ))}
          <Text style={styles.text}>{t('method.plan.before')}</Text>
        </View>
      );
    case 'neutral':
      return (
        <View style={styles.block} testID={`note-${note.code}`}>
          <Text style={styles.text}>{t(`method.neutral.${note.code}`)}</Text>
          {note.line !== undefined && (
            <MathBlock
              latex={lineLatex(note.line)}
              fontSize={theme.font.size.body}
            />
          )}
          {note.check !== undefined && (
            <>
              <Text style={styles.text}>{t('method.neutral.checkLead')}</Text>
              <MathBlock
                latex={lineLatex(note.check)}
                fontSize={theme.font.size.body}
              />
            </>
          )}
        </View>
      );
    case 'claim_result':
      return (
        <View style={styles.block} testID="note-claim-result">
          {note.rows.map((r, i) => (
            <View key={i} style={styles.block}>
              {r.label !== undefined && (
                <MathBlock latex={r.label} fontSize={theme.font.size.body} />
              )}
              <Text style={styles.text}>{t('method.claim.predicted')}</Text>
              <MathBlock latex={r.predicted} fontSize={theme.font.size.body} />
              <Text style={styles.text}>{t('method.claim.actual')}</Text>
              <MathBlock latex={r.actual} fontSize={theme.font.size.body} />
              <Text style={styles.text}>
                {t(r.holds ? 'method.claim.holds' : 'method.claim.fails')}
              </Text>
            </View>
          ))}
        </View>
      );
    case 'list_help':
      return (
        <View style={styles.block} testID="note-list-help">
          <Text style={styles.text}>{t(`method.listHelp.${note.level}`)}</Text>
          {note.ball !== undefined && (
            <Text style={styles.line}>{note.ball}</Text>
          )}
          {note.group !== undefined && (
            <Text style={styles.line}>{note.group.join('  ')}</Text>
          )}
        </View>
      );
    case 'recipe':
      return (
        <View style={styles.block} testID="note-recipe">
          <Text style={styles.heading}>{t('method.recipe.mine')}</Text>
          {note.mine.map((r, i) => (
            <RichView key={i} rich={r} />
          ))}
          <Text style={styles.heading}>{t('method.recipe.clean')}</Text>
          {note.clean.map((r, i) => (
            <RichView key={i} rich={r} />
          ))}
          {note.card && (
            <View style={styles.block} testID="note-method-card">
              <RichView
                rich={note.card.type}
                fontFamily={theme.font.family.ui.bold}
              />
              <Text style={styles.heading}>{t('method.recipe.steps')}</Text>
              {note.card.steps.map((r, i) => (
                <RichView key={i} rich={r} />
              ))}
              <Text style={styles.heading}>{t('method.recipe.checks')}</Text>
              {note.card.checks.map((r, i) => (
                <RichView key={i} rich={r} />
              ))}
            </View>
          )}
        </View>
      );
    case 'review':
      return (
        <View style={styles.block} testID={`note-review-${note.outcome}`}>
          <MathBlock
            latex={lineLatex(note.raw)}
            fontSize={theme.font.size.body}
          />
          <Text style={styles.text}>{reviewLabel(t, note)}</Text>
        </View>
      );
    case 'target':
      return (
        <View style={styles.block} testID="note-target">
          <Text style={styles.text}>{t('method.target.lead')}</Text>
          <RichView rich={note.target} />
          <MathBlock
            latex={lineLatex(note.line)}
            fontSize={theme.font.size.body}
          />
        </View>
      );
  }
}

const styles = StyleSheet.create({
  block: { gap: theme.space.xs },
  clause: {
    flexDirection: theme.reading.row,
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.space.xs,
  },
  text: {
    color: theme.color.ink,
    fontFamily: theme.font.family.ui.regular,
    fontSize: theme.font.size.body,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  heading: {
    color: theme.color.textSecondary,
    fontFamily: theme.font.family.ui.bold,
    fontSize: theme.font.size.small,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  line: {
    color: theme.color.ink,
    fontFamily: theme.font.family.math.family,
    fontSize: theme.font.size.body,
    writingDirection: 'ltr',
    textAlign: 'left',
  },
});
