import React, {
  useState,
  ChangeEvent,
  FormEvent,
  useEffect,
  useReducer,
} from 'react';
import axios from 'axios';
import * as R from 'ramda';

const { REACT_APP_GITHUB_PERSONAL_ACCESS_TOKEN: GITHUB_TOKEN } = process.env;

const githubGraphQL = axios.create({
  baseURL: 'https://api.github.com/graphql',
  headers: {
    Authorization: `bearer ${GITHUB_TOKEN}`,
  },
});

const GET_REPOSITORIES = `
  query ($organization: String!, $limit: Int = 2, $cursor: String) {  
    organization(login: $organization) {
      name
      url
      repositories(first: $limit, after: $cursor) {
        totalCount
        pageInfo {
          endCursor
          hasNextPage
        }
        edges {
          node {
            id
            name
            viewerHasStarred
            stargazers {
              totalCount
            }
            description
            createdAt
          }
        }
      }
    }
  }
`;

type Repositories = {
  totalCount: number;
  pageInfo: {
    endCursor: string;
    hasNextPage: boolean;
  };
  edges: any[];
};

type Error = {
  type: string;
  message: string;
};

type GQResponse = {
  name: string;
  url: string;
  repositories: Repositories;
};

type State =
  | { status: 'empty' }
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: GQResponse };

type Action =
  | { type: 'request' }
  | { type: 'init'; data: GQResponse }
  | { type: 'more'; data: GQResponse }
  | { type: 'error'; error: string };

const getReposOfOrganization = (
  organization: string,
  limit: number,
  cursor?: string,
) => {
  return githubGraphQL.post('', {
    query: GET_REPOSITORIES,
    variables: { organization, limit, cursor },
  });
};

const edgeLens = R.lensPath(['data', 'repositories', 'edges']);
const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'request':
      return { status: 'loading' };
    case 'init':
      return { status: 'success', data: action.data };
    case 'more':
      if (state.status !== 'success') return state;
      const oldRepos: any[] = R.view(edgeLens, state);
      const { data } = R.over(edgeLens, R.concat(oldRepos), action);
      return {
        status: 'success',
        data: data,
      };
    case 'error':
      return { status: 'error', error: action.error };
  }
};

const App = () => {
  const [usrInput, setUsrInput] = useState('the-road-to-learn-react');
  const [query, setQuery] = useState('the-road-to-learn-react');
  const [state, dispatch] = useReducer(reducer, { status: 'empty' });

  const onSubmit = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    setQuery(usrInput);
  };

  const onFetchRepos = async (
    search: string,
    limit: number,
    cursor?: string,
  ) => {
    try {
      const {
        data: { data, errors },
      } = await getReposOfOrganization(search, limit, cursor);

      if (errors) {
        const message = errors
          .map((error: Error) => `[${error.type}] ${error.message}`)
          .join(', ');
        throw Error(message);
      }

      if (!cursor) {
        dispatch({ type: 'init', data: data.organization });
      } else {
        dispatch({ type: 'more', data: data.organization });
      }
    } catch (error) {
      dispatch({ type: 'error', error: error.stack });
    }
  };

  const onFetchMoreRepos = () => {
    if (state.status !== 'success') return;
    const cursor = state.data.repositories.pageInfo.endCursor;
    onFetchRepos(query, 4, cursor);
  };

  const onChange = (ev: ChangeEvent<HTMLInputElement>) =>
    setUsrInput(ev.target.value);

  useEffect(() => {
    onFetchRepos(query, 4);
  }, [query]);

  return (
    <div>
      <h1>React with GraphQL</h1>
      <form onSubmit={onSubmit}>
        <label htmlFor="url">Show open issues for https://github.com/</label>
        <input
          id="url"
          type="text"
          value={usrInput}
          onChange={onChange}
          style={{ width: '300px' }}
        ></input>
        <button type="submit">Search</button>
      </form>
      <hr />
      {state.status === 'loading' && <div>Loading ...</div>}
      {state.status === 'error' && <strong>{state.error}</strong>}
      {state.status === 'success' && (
        <Organization
          data={state.data}
          onFetchMore={onFetchMoreRepos}
        ></Organization>
      )}
    </div>
  );
};

interface OrganizationProps {
  data: GQResponse;
  onFetchMore: () => void;
}
const Organization = ({ data, onFetchMore }: OrganizationProps) => (
  <div>
    <p>
      <strong>Issues from Organizations:</strong>
      <a href={data.url}>{data.name}</a>
    </p>
    <Repositories repositories={data.repositories} onFetchMore={onFetchMore} />
  </div>
);

type RepositoriesProp = {
  repositories: Repositories;
  onFetchMore: () => void;
};
const Repositories = ({ repositories, onFetchMore }: RepositoriesProp) => (
  <div>
    <p>Total repositories: {repositories.totalCount}</p>
    <ol>
      {repositories.edges.map(edge => (
        <li key={edge.node.id}>
          <p>Name: {edge.node.name}</p>
          <p>Description: {edge.node.description}</p>
          <span>
            Stars: {edge.node.stargazers.totalCount} /{' '}
            {`${edge.node.viewerHasStarred}`}
          </span>
        </li>
      ))}
    </ol>
    {repositories.pageInfo.hasNextPage && (
      <button onClick={onFetchMore}>More</button>
    )}
  </div>
);

export default App;
