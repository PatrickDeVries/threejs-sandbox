import Link from 'next/link';
import { Text } from '@headstorm/foundry-react-ui';
import styled from 'styled-components';
import React from 'react';

const GreetingBlock = styled.div`
  margin-top: 100%;
  filter: drop-shadow(0 0 4rem green);
`;

const IntroText = styled(Text.Container)`
  display: block;
  margin-left: auto;
  margin-right: auto;
  margin-top: 1rem;
  text-align: center;
`;

const CenteredA = styled.a`
  margin-left: auto;
  margin-right: auto;
  text-align: center;
`;

export default function Home() {
  return (
    <>
      <GreetingBlock>
        <Text color="black" StyledContainer={IntroText} size="2rem">
          Welcome to my website
        </Text>
      </GreetingBlock>
    </>
  );
}
