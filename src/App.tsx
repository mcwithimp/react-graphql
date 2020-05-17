import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import axios from 'axios';

const { REACT_APP_GITHUB_PERSONAL_ACCESS_TOKEN: GITHUB_TOKEN } = process.env;

const githubGraphQL = axios.create({
  baseURL: 'https://api.github.com/graphql',
  headers: {
    Authorization: `bearer ${GITHUB_TOKEN}`,
  },
});

const GET_ORGANIZATION = `
  {
    organization(login: "the-road-to-learn-react") {
      name
      url
      repositories(first: 2) {
        totalCount
        pageInfo {
          endCursor
          hasNextPage
        }
        edges {
          node {
            name
            description
            createdAt
          }
        }
      }
    }
  }
`;

const App = () => {
  const [path, setPath] = useState(
    'the-road-to-learn-react/the-road-to-learn-react',
  );

  const onSubmit = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
  };

  const onChange = (ev: ChangeEvent<HTMLInputElement>) =>
    setPath(ev.target.value);

  const onFetchFromGithub = () => {
    githubGraphQL
      .post('', { query: GET_ORGANIZATION })
      .then(result => console.log(result));
  };

  useEffect(() => {
    onFetchFromGithub();
  }, []);

  return (
    <div>
      <h1>React with GraphQL</h1>
      <form onSubmit={onSubmit}>
        <label htmlFor="url">Show open issues for https://github.com/</label>
        <input
          id="url"
          type="text"
          value={path}
          onChange={onChange}
          style={{ width: '300px' }}
        ></input>
        <button type="submit">Search</button>
      </form>
      <hr />
    </div>
  );
};

export default App;
