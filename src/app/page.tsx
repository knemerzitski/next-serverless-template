'use client';

import { ApolloProvider } from '@apollo/client';
import classNames from 'classnames';

import TodoList from '@/components/TodoList';
import apolloClient from '@/utils/graphqlClient';

export default function Home() {
  return (
    <ApolloProvider client={apolloClient}>
      <main className="min-h-screen bg-slate-50 text-lg">
        <div className="pt-10 flex justify-center">
          <div
            className={classNames(
              'px-4 py-8 mx-2',
              'border border-gray-600  rounded-sm bg-slate-100 shadow-2xl shadow-black/5'
            )}
          >
            <h1 className="font-semibold text-2xl text-center">TODO List</h1>
            <TodoList />
          </div>
        </div>
      </main>
    </ApolloProvider>
  );
}
