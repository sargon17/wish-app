import ProjectPage from '@/components/project/ProjectPage'

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params

  return (
    <>
      <ProjectPage id={projectId} />
    </>
  )
}
