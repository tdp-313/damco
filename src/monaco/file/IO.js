export const file_read_text = async (readTarget, handle, isdirectory = true, saveType = 'text') => {
  let file_obj = handle;
  if (isdirectory) {
    try {
      file_obj = await handle.getFileHandle(readTarget, { create: false });
    } catch (error) {
      return null;
    }
  }
  let file = await file_obj.getFile();
  let ext = '★';
  if (file.name.length > 3) {

    let nu_ext = file.name.substring(file.name.indexOf(".") + 1, file.name.length);
    if (!isNaN(Number(nu_ext))) {
      ext = Number(nu_ext);
      if (ext < 10) {
        ext = ext; 
      }
    }
  }
  let lastModifiedTime = ext + '__' + await file.lastModifiedDate.toLocaleString();
  let rtn = { time: lastModifiedTime, text: "" };
  if (saveType === 'text') {
    const response = await fetch(URL.createObjectURL(file));
    const arrayBuffer = await response.arrayBuffer();
    const decoderUTF = new TextDecoder('utf-8');
    const textUTF = decoderUTF.decode(arrayBuffer);
    let text = textUTF;
    if (textUTF.includes('�')) {
      const decoderJIS = new TextDecoder('Shift-JIS');
      const textJIS = decoderJIS.decode(arrayBuffer);
      if (!textJIS.includes('�')) {
        text = textJIS;
      }
    }
    if (text === '') {
      return rtn;
    }
    rtn.text = text;
    return (rtn);
  } else if (saveType === 'json') {
    let text = await file.text();
    if (text === '') {
      return [];
    }
    rtn.text = JSON.parse(text)
    return (rtn);
  } else if (saveType === 'bin') {
    let data = await file.arrayBuffer();
    rtn.text = new Uint8Array(data)
    return (rtn);
  }
}