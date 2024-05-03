import { CodeXml, Eye, Type } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../Interface/Tabs';
import { Textarea } from '../Interface/Textarea';
import { EmailIFrame } from './EmailIframe';

type EmailPreviewTabsProps = {
  html: string;
  text: string;
};

export function EmailPreviewTabs(props: EmailPreviewTabsProps) {
  const { html, text } = props;

  return (
    <Tabs defaultValue='preview'>
      <TabsList className='rounded-lg'>
        <TabsTrigger value='preview' className='font-normal rounded-md'>
          <Eye size={14} className='mr-1.5 stroke-[2.5px]' />
          Preview
        </TabsTrigger>
        <TabsTrigger
          value='html'
          className='font-normal rounded-md'
          disabled={!html}
        >
          <CodeXml size={14} className='mr-1.5 stroke-[2.5px]' />
          HTML
        </TabsTrigger>
        <TabsTrigger
          value='text'
          className='font-normal rounded-md'
          disabled={!text}
        >
          <Type size={14} className='mr-1.5 stroke-[2.5px]' />
          Text
        </TabsTrigger>
      </TabsList>
      <TabsContent value='preview'>
        <EmailIFrame
          innerHTML={html || text || '<p>No content</p>'}
          wrapperClassName='bg-white rounded-md min-h-[300px]'
        />
      </TabsContent>
      <TabsContent value='html'>
        <Textarea
          defaultValue={html}
          readOnly={true}
          className='min-h-[300px]'
        />
      </TabsContent>
      <TabsContent value='text'>
        <Textarea
          defaultValue={text}
          readOnly={true}
          className='min-h-[300px]'
        />
      </TabsContent>
    </Tabs>
  );
}
