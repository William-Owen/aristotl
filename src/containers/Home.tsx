import _ from 'lodash';
import { Document } from 'prismic-javascript/d.ts/documents';
import { animations, container, media, selectors } from 'promptu';
import qs from 'query-string';
import React, { createRef, Fragment, PureComponent } from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { Transition } from 'react-transition-group';
import { TransitionStatus } from 'react-transition-group/Transition';
import { Action, bindActionCreators, Dispatch } from 'redux';
import styled from 'styled-components';
import ActionButton from '../components/ActionButton';
import DefinitionStackModal from '../components/DefinitionStackModal';
import FallacyStackModal from '../components/FallacyStackModal';
import Footer from '../components/Footer';
import Grid from '../components/Grid';
import Paginator from '../components/Paginator';
import SearchBar from '../components/SearchBar';
import Statistics from '../components/Statistics';
import NavControlManager from '../managers/NavControlManager';
import { AppState } from '../store';
import { fetchDefinitions } from '../store/definitions';
import { FallaciesFilters, fetchFallacies, filterFallacies, getFilteredFallacies, presentFallacyById } from '../store/fallacies';
import { colors } from '../styles/theme';
import { timeoutByTransitionStatus, valueByTransitionStatus } from '../styles/utils';

const debug = (process.env.NODE_ENV === 'development' || __APP_CONFIG__.enableDebugInProduction === true) ? require('debug')('app:home') : () => {};

interface StateProps {
  activeDefinitionIds: Array<string>;
  activeFallacyIds: Array<string>;
  fallacyDict: ReadonlyArray<Document>;
  filteredFallacies: ReadonlyArray<Document>;
  searchInput: string;
  filters: FallaciesFilters;
}

interface DispatchProps {
  fetchDefinitions: typeof fetchDefinitions;
  fetchFallacies: typeof fetchFallacies;
  filterFallacies: typeof filterFallacies;
  presentFallacyById: typeof presentFallacyById;
}

interface Props extends StateProps, DispatchProps, RouteComponentProps<{}> {
  docsPerPage: number;
}

interface State {
  isSearching: boolean;
  isSummaryEnabled: boolean;
  pageIndex: number;
}

class Home extends PureComponent<Props, State> {
  static defaultProps: Partial<Props> = {
    docsPerPage: 20,
  };

  state: State = {
    isSearching: false,
    isSummaryEnabled: false,
    pageIndex: 0,
  };

  nodeRefs = {
    paginator: createRef<Paginator>(),
  };

  constructor(props: Props) {
    super(props);
    this.props.fetchFallacies();
    this.props.fetchDefinitions();
  }

  componentDidMount() {
    // this.mapHashToState();
    // this.mapQueryStringToState();
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    const searchInputDidChange = prevProps.searchInput !== this.props.searchInput;
    const filtersDidChange = !_.isEqual(prevProps.filters, this.props.filters);

    if (searchInputDidChange || filtersDidChange) {
      this.setState({
        pageIndex: 0,
      });
    }
  }

  toNextPage() {
    const paginator = this.nodeRefs.paginator.current;
    if (!paginator) return;
    paginator.next();
  }

  toPreviousPage() {
    const paginator = this.nodeRefs.paginator.current;
    if (!paginator) return;
    paginator.prev();
  }

  mapHashToState() {
    if (!this.props.location.hash.startsWith('#')) return;
    const docId = this.props.location.hash.substring(1);

    this.props.presentFallacyById(docId);
  }

  mapQueryStringToState() {
    const { search, page } = qs.parse(this.props.location.search);
    const searchInput = (typeof search === 'string' && search !== '') ? search : '';
    const pageIndex = ((typeof page === 'string') && parseInt(page, 10) || 1) - 1;

    this.setState({
      pageIndex,
    });
  }

  mapStateToQueryString(nextState: { searchInput?: string, pageIndex?: number } = {}): string {
    const searchInput = (nextState.searchInput === undefined) ? this.props.searchInput : nextState.searchInput;
    const pageIndex = (nextState.pageIndex === undefined) ? this.state.pageIndex : nextState.pageIndex;
    const params = [];

    if (searchInput !== undefined && searchInput !== '') params.push(`search=${searchInput}`);
    if (pageIndex !== undefined && pageIndex > 0) params.push(`page=${pageIndex + 1}`);

    return (params.length > 0) ? `?${params.join('&')}` : '';
  }

  onPageIndexChange(index: number, shouldUpdateHistory: boolean = false) {
    this.setState({
      pageIndex: index,
    });
  }

  render() {
    const results = this.props.filteredFallacies;
    const pageIndex = this.state.pageIndex;
    const pages = _.chunk(results, this.props.docsPerPage);
    const numPages = pages.length;
    const currResults = pages[pageIndex] || [];

    return (
      <Fragment>
        <Transition in={this.props.activeFallacyIds.length === 0} timeout={timeoutByTransitionStatus(200)} mountOnEnter={false}>
          {(status) => (
            <NavControlManager
              isEnabled={!this.state.isSearching && this.props.activeDefinitionIds.length === 0 && this.props.activeFallacyIds.length === 0}
              onPrev={() => this.toPreviousPage()}
              onNext={() => this.toNextPage()}
            >
              <StyledRoot transitionStatus={status}>
                <StyledHeader>
                  <SearchBar
                    autoFocus={this.props.activeFallacyIds.length === 0 && this.props.activeDefinitionIds.length === 0}
                    onFocusIn={() => this.setState({ isSearching: true })}
                    onFocusOut={() => this.setState({ isSearching: false })}
                  />
                  <ActionButton
                    symbol='i'
                    isTogglable={true}
                    tintColor={colors.white}
                    hoverTintColor={colors.red}
                    activeTintColor={colors.red}
                    onToggleOn={() => this.setState({ isSummaryEnabled: true })}
                    onToggleOff={() => this.setState({ isSummaryEnabled: false })}
                  />
                </StyledHeader>
                <Statistics
                  docsPerPage={this.props.docsPerPage}
                  pageIndex={this.state.pageIndex}
                  results={results}
                />
                <Paginator
                  ref={this.nodeRefs.paginator}
                  activePageIndex={this.state.pageIndex}
                  numPages={numPages}
                  onActivate={(index) => this.onPageIndexChange(index)}
                />
                <Grid
                  id={`${this.props.searchInput}-${this.state.pageIndex}`}
                  docs={currResults}
                  isSummaryEnabled={this.state.isSummaryEnabled}
                  onActivate={(doc) => doc.uid && this.props.presentFallacyById(doc.uid)}
                />
                <Footer/>
              </StyledRoot>
            </NavControlManager>
          )}
        </Transition>
        <FallacyStackModal/>
        <DefinitionStackModal/>
      </Fragment>
    );
  }
}

export default connect(
  (state: AppState): StateProps => ({
    activeDefinitionIds: state.definitions.activeDocIds,
    activeFallacyIds: state.fallacies.activeDocIds,
    fallacyDict: state.fallacies.docs[__I18N_CONFIG__.defaultLocale] || [],
    filteredFallacies: getFilteredFallacies(state.fallacies),
    filters: state.fallacies.filters,
    searchInput: state.fallacies.searchInput,
  }),
  (dispatch: Dispatch<Action>): DispatchProps => bindActionCreators({
    fetchDefinitions,
    fetchFallacies,
    filterFallacies,
    presentFallacyById,
  }, dispatch),
)(Home);

const StyledHeader = styled.header`
  ${container.fhcl}
  width: 100%;
  margin-bottom: 1rem;
  justify-content: space-between;

  ${selectors.eblc} {
    margin-right: 2rem;
  }
`;

const StyledRoot = styled.div<{
  transitionStatus: TransitionStatus;
}>`
  ${animations.transition(['opacity', 'transform'], 200, 'ease-in-out')}
  ${container.fvtl}
  background: ${(props) => props.theme.colors.black};
  min-height: 100%;
  opacity: ${(props) => valueByTransitionStatus([0.4, 1], props.transitionStatus)};
  padding: 5rem 2rem 3rem;
  perspective: 80rem;
  pointer-events: ${(props) => valueByTransitionStatus(['none', 'auto'], props.transitionStatus)};
  transform-origin: center;
  transform: ${(props) => valueByTransitionStatus(['translate3d(0, 0, 0) scale(.9)', 'translate3d(0, 0, 0) scale(1)'], props.transitionStatus)};
  width: 100%;

  @media ${media.gtw(500)} {
    padding: 5rem 5rem 3rem;
  }
`;
