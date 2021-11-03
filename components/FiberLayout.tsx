import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import styled from 'styled-components';
import {
  BufferAttribute,
  BufferGeometry,
  InterleavedBufferAttribute,
  Points,
  TextureLoader,
} from 'three';

const BgCanvas = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 100vw;
  // background-color: black;
  background-image: linear-gradient(168deg, #ffffff, #999);
`;

function Box(props) {
  // This reference gives us direct access to the THREE.Mesh object
  const ref = useRef();
  // Hold state for hovered and clicked events
  const [hovered, hover] = useState(false);
  const [clicked, click] = useState(false);

  // Subscribe this component to the render-loop, rotate the mesh every frame
  useFrame((state, delta) => (ref.current.rotation.x += 0.01));
  // Return the view, these are regular Threejs elements expressed in JSX
  return (
    <mesh
      {...props}
      ref={ref}
      scale={clicked ? 1.5 : 1}
      onClick={() => click(!clicked)}
      onPointerOver={() => hover(true)}
      onPointerOut={() => hover(false)}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hovered ? 'hotpink' : 'orange'} />
    </mesh>
  );
}

const visibleHeightAtZDepth = (depth, camera) => {
  // compensate for cameras not positioned at z=0
  const cameraOffset = camera.position.z;
  if (depth < cameraOffset) depth -= cameraOffset;
  else depth += cameraOffset;

  // vertical fov in radians
  const vFOV = (camera.fov * Math.PI) / 180;

  // Math.abs to ensure the result is always positive
  return 2 * Math.tan(vFOV / 2) * Math.abs(depth);
};

const visibleWidthAtZDepth = (depth, camera) => {
  const height = visibleHeightAtZDepth(depth, camera);
  return height * camera.aspect;
};

const Particles = props => {
  const viewport = useThree(state => state.viewport);
  console.log('viewport', viewport);
  const particles = useRef<BufferGeometry>();
  const pointRef = useRef<Points>();
  const particleCount = 100;
  const baseV = 0.03;
  const vVariance = 0.003;
  const baseTurnSpeed = 0.02 * Math.PI;
  const turnVariance = 0.002 * Math.PI;
  const positions = [];
  const velocities = [];
  const angles = [];
  for (let i = 0; i < particleCount; i++) {
    positions.push(
      Math.random() * viewport.width - viewport.width / 2,
      Math.random() * viewport.height - viewport.height / 2,
      0,
    );
    velocities.push(Math.random() * vVariance, Math.random() * turnVariance, 0);
    angles.push(Math.random() * 2 * Math.PI);
  }

  const pi2 = Math.PI * 2;
  let count = 0;

  const updatePositions = () => {
    if (particles.current) {
      count += 1;
      // console.log('particles', particles);
      const pps: BufferAttribute = particles.current['attributes']['position'] as BufferAttribute;
      const pvs: BufferAttribute = particles.current['attributes']['velocity'] as BufferAttribute;
      const pas: BufferAttribute = particles.current['attributes']['angle'] as BufferAttribute;
      if (count < 10) {
        console.log('p', pps, 'v', pvs, 'a', pas);
      }
      // console.log('pas', pas);
      for (let i = 0, l = particleCount; i < l; i++) {
        let angle = pas.getX(i);
        let v = pvs.getX(i) + baseV;
        let turnV = pvs.getY(i) + baseTurnSpeed;

        pps.setXY(i, pps.getX(i) + v * Math.cos(angle), pps.getY(i) + v * Math.sin(angle));
        if (i === 0 && count < 10) {
          console.log('a', angle, 'v', v, 't', turnV);
        }

        if (pps.getX(i) > viewport.width / 2 || pps.getX(i) < -viewport.width / 2) {
          pas.setX(i, Math.atan2(v * Math.sin(angle), -v * Math.cos(angle)));
        } else if (pps.getY(i) > viewport.height / 2 || pps.getY(i) < -viewport.height / 2) {
          pas.setX(i, Math.atan2(-v * Math.sin(angle), v * Math.cos(angle)));
        } else if (i % 200 !== 0 && i > 0) {
          let goalAngle = Math.atan2(pps.getY(i - 1) - pps.getY(i), pps.getX(i - 1) - pps.getX(i));
          let newAngle =
            ((goalAngle - angle + Math.PI) % pi2) - Math.PI < turnV
              ? goalAngle
              : goalAngle > (angle + Math.PI) % pi2
              ? angle - turnV
              : angle + turnV;
          pas.setX(i, newAngle % pi2);
        }
      }
    }
  };

  useFrame(() => {
    updatePositions();
    particles.current['attributes']['position'].needsUpdate = true;
  });

  // const particleTexture = useLoader(TextureLoader, 'particle.png');

  return (
    <points ref={pointRef}>
      <bufferGeometry ref={particles} attach="geometry">
        <bufferAttribute
          attachObject={['attributes', 'position']}
          count={particleCount}
          array={new Float32Array(positions)}
          itemSize={3}
        />
        <bufferAttribute
          attachObject={['attributes', 'velocity']}
          count={particleCount}
          array={new Float32Array(velocities)}
          itemSize={3}
        />
        <bufferAttribute
          attachObject={['attributes', 'angle']}
          count={particleCount}
          array={new Float32Array(angles)}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        attach="material"
        size={0.1}
        color="#0000ff"
        // map={particleTexture}
        // map={new THREE.TextureLoader().load('/particle.png')}
        // blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

const FiberLayout = () => {
  return (
    <BgCanvas>
      <Canvas camera={{ position: [0, 0, 5] }}>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
        <pointLight position={[-10, -10, -10]} />
        <bufferGeometry />
        <pointsMaterial />
        <Box position={[0, 0, 0]} />
        {/* <Box position={[2, 0, 0]} /> */}
        <Particles />
      </Canvas>
    </BgCanvas>
  );
};

export default FiberLayout;
